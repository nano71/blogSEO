const express = require("express")
const puppeteer = require("puppeteer");
const targetHost = "https://blog.nano71.com"
const app = express()
const port = 9001

let browserWSEndpoint
let browser
let timer

app.get('*', async (req, res) => {

    if (!req.url.includes(".")) {
        console.log(req.url);
        res.contentType("text/html")
        res.send(await fetchHTML(req.url));
        closeBrowser()
    } else {
        console.log("skip", req.url)
        res.status(400).send("Bad Request")
    }

});

// 启动 Express应用程序, 监听指定的端口号
app.listen(port, undefined, () => {
    console.log("\n");
    console.log("----------------------START----------------------\n");
    console.log(`Service listening on port ${port}`)
})

/**
 * 获取网页内容
 * @param {string} url
 * @return Promise<string>
 */
async function fetchHTML(url) {
    if (browserWSEndpoint) {
        browser = await puppeteer.connect({
            browserWSEndpoint
        })
    } else {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        browserWSEndpoint = browser.wsEndpoint()
    }
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path.includes(".") && !path.endsWith(".js")) {
            // 中止请求
            request.abort();
        } else {
            // 继续请求
            request.continue();
        }
    });
    await page.goto(targetHost + url, {
        waitUntil: 'networkidle0'
    });
    let html = await page.content();
    await page.close()
    return html
}

function closeBrowser() {
    clearTimeout(timer)
    timer = setTimeout(async () => {
        if ((await browser.pages()).length === 1) {
            browserWSEndpoint = undefined
            await browser.close();
        }
    }, 5000)
}
