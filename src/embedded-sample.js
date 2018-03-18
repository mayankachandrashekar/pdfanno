require('file-loader?name=dist/embedded-sample.html!./embedded-sample.html')
require('!style-loader!css-loader!./embedded-sample.css')

// sample.
// ?pdf=https://yoheim.net/tmp/bitcoin.pdf&anno=https://yoheim.net/tmp/bitcoin.anno

// TODO 後でコア機能は別JSに移してもいいかも.
import URI from 'urijs' // TODO これが意外と重たいようだ... setTimeoutで時間かかりすぎの警告が出ている.
import PDFAnnoPage from './page/pdf/PDFAnnoPage'
import * as publicApi from './page/public'
import { unlistenWindowLeaveEvent } from './page/util/window'

/**
 * API root point.
 */
if (process.env.NODE_ENV === 'production') {
    window.API_DOMAIN = 'https://pdfanno.hshindo.com'
    window.API_PATH = '/' + process.env.SERVER_PATH + '/'
    window.API_ROOT = window.API_DOMAIN + window.API_PATH
} else {
    window.API_DOMAIN = 'http://localhost:3000'
    window.API_PATH = '/'
    window.API_ROOT = window.API_DOMAIN + window.API_PATH
}

// ServiceWorker.
(async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = navigator.serviceWorker.register('./sw.js')
            console.log('ServiceWorker registration successed. with scope: ' + registration.scope)
        } catch (err) {
            console.log('ServiceWorker registration failed. reason: ' + err)
        }
    }
})();

window.annoPage = new PDFAnnoPage()

function getPDFUrlFromQuery () {
    return URI(document.URL).query(true).pdf
}

function getAnnoUrlFromQuery () {
    return URI(document.URL).query(true).anno
}

function getPDFName (url) {
    const a = url.split('/')
    return a[a.length - 1]
}

window.addEventListener('DOMContentLoaded', async () => {

    const pdfUrl = getPDFUrlFromQuery()

    // Init without a pdf.
    window.annoPage.initializeViewer(null)

    // Load a default pdf, if no one was specified.
    if (!pdfUrl) {
        return
    }

    // Get pdf and pdf.txt.
    let { pdf } = await window.annoPage.loadPDFFromServer(pdfUrl)

    // Start application.
    window.annoPage.startViewerApplication()

    // Wait until iframe ready.
    // TODO できればwindowにしたくない..が、displayViewer()が中でwindowを期待している.
    window.addEventListener('iframeReady', () => {
        setTimeout(() => {
            window.annoPage.displayViewer({
                name    : getPDFName(pdfUrl),
                content : pdf
            })
        }, 500)
    })

    const annoUrl = getAnnoUrlFromQuery()
    console.log('annoUrl:', annoUrl)
    if (!annoUrl) {
        return
    }

    const listenPageRendered = async () => {
        // Load and display annotations.
        let anno = await window.annoPage.loadAnnoFileFromServer(annoUrl)
        console.log('anno:', anno)
        publicApi.addAllAnnotations(publicApi.readTOML(anno))
        window.removeEventListener('pagerendered', listenPageRendered)
    }
    window.addEventListener('pagerendered', listenPageRendered)

    $('#pdfSelect').on('change', () => {
        const url = $('#pdfSelect').val()
        console.log('url:', url)
    })

    // temporary.
    setInterval(unlistenWindowLeaveEvent, 500)
})

