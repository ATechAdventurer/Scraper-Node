require('dotenv').config();
const fs = require('fs');
const { createApi } = require("instamancer");
const { HASHTAG, SCRAPE_TOTAL, SAVE_PATH, MOTHERSHIP_URL } = process.env;

const hashtagSearch = createApi("hashtag", HASHTAG, {
    total: SCRAPE_TOTAL,
    fullAPI: true,
    hibernationTime: 3,
    headless: true,
    executablePath: "/usr/bin/chromium-browser"
    
});

(async () => {
    let data = [];
    console.log("Scraping Begins");
    for await (const post of hashtagSearch.generator()) {
        data.push(post);
    }
    console.log("Scraping finished");
    fs.writeFileSync(`${HASHTAG}.json`, JSON.stringify(data));

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
        } catch (e) {}
        let date = new Date(taken_at_timestamp * 1000);
       
        return { post_hash, account_name, likes, comments, url: `https://www.instagram.com/p/${post_hash}`, post_type: is_video ? "Video" : "Photo", caption, posted: date.toUTCString() };
    });
    //Post Boiled Data
    var unirest = require('unirest');
    var req = unirest('POST', MOTHERSHIP_URL)
        .headers({
            'Content-Type': 'application/json',
        })
        .send(JSON.stringify({
            hashtag: HASHTAG,
            posts: boiledData
        }))
        .end(function (res) {
            if (res.error) throw new Error(res.error);
            console.log(res.raw_body);
        });
})();