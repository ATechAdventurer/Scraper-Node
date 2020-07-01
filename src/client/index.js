require('dotenv').config();
const fs = require('fs');
const { createApi } = require("instamancer");
//const { HASHTAG, SCRAPE_TOTAL, SAVE_PATH, MOTHERSHIP_URL } = process.env;

const io = require('socket.io-client');

const socket = io('http://localhost:3000');
let status = false;
socket.on('whoareyou', () => {
    socket.emit('iam', { friendlyName: process.argv[2] || "Big Man Slim", status: 'online' });
    socket.on('employment', async ({ tag, count }) => {
        status = true;
        console.log("Given a new job", tag, count)
        const hashtagSearch = createApi("hashtag", tag, {
            total: count,
            fullAPI: true,
            hibernationTime: 3,
            headless: true,
            //executablePath: "/usr/bin/chromium-browser"
        });

        let data = [];
        console.log("Scraping Begins");
        for await (const post of hashtagSearch.generator()) {
            data.push(post);
        }
        console.log("Scraping finished");
        fs.writeFileSync(`${tag}.json`, JSON.stringify(data));

        //Boil Data
        let boiledData = data.map(item => {
            const {
                shortcode: post_hash,
                owner: { username: account_name },
                edge_media_preview_like: { count: likes },
                edge_media_preview_comment: { count: comments },
                is_video,
                edge_media_to_caption,
                taken_at_timestamp

            } = item.shortcode_media;
            let caption = "";

            try {
                caption = edge_media_to_caption.edges[0].node.text;
            } catch (e) { }
            let date = new Date(taken_at_timestamp * 1000);

            return { post_hash, account_name, likes, comments, url: `https://www.instagram.com/p/${post_hash}`, post_type: is_video ? "Video" : "Photo", caption, posted: date.toUTCString() };
        });
        //Post Boiled Data
        socket.emit('clockout', boiledData);
        console.log("Done with job")
        status = false;
    })
})

setInterval(() => {
    if(!status){
        socket.emit('pester');
    }
}, 5000)
