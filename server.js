const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const useragent = require('useragent');
const dotenv = require('dotenv');
const cheerio = require('cheerio');
const axios = require('axios');
const { v4: uuid } = require('uuid');

// const metascraper = require('metascraper')([
//     require('metascraper-title')(),
//     require('metascraper-image')(),
//     require('metascraper-description')(),
// ]);


const Url = require('./models/Url');
const Slug = require('./models/Slug');

class UrlShortenerApp {
    constructor() {
        this.app = express();
        this.app.use(express.json());

        dotenv.config();
        
        this.connectToDatabase();
        this.configureRoutes();
    }
    
    connectToDatabase() {
        let mongoUser     = process.env.MONGO_USER;
        let mongoPassword = process.env.MONGO_PASSWORD;
        let mongoDbName   = process.env.MONGO_DB_NAME;
        let url           = "mongodb+srv://" + mongoUser + ":" + mongoPassword + "@commentproject.vt9th.mongodb.net/" + mongoDbName  + "?retryWrites=true&w=majority";

        mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).then(() => { 
            console.log("Successfully connected to the database");
        }).catch(err => {
            console.log('Could not connect to the database. Exiting now...', err);
            process.exit();
        });
    }
    
    configureRoutes() {
        this.app.post('/shorten', this.shortenUrl.bind(this));
        this.app.get('/:slug', this.redirectUrl.bind(this));
        this.app.post('/metadata', this.extractMetadata.bind(this));
    }
    
    async shortenUrl(req, res) {
        const { longUrl, slug } = req.body;
      
        try {
            let generatedSlug = slug || shortid.generate();
            let existingSlug = null;
        
            if (slug) {
            existingSlug = await Slug.findOne({ slug });
            if (existingSlug) {
                return res.status(400).json({ error: 'Slug already exists' });
            }
            }
        
            let isUnique = false;
            while (!isUnique) {
                existingSlug = await Slug.findOne({ slug: generatedSlug });
                if (existingSlug) {
                    generatedSlug = shortid.generate();
                } else {
                    isUnique = true;
                }
            }
        
            let uid = uuid();
            const newSlug = await Slug.create({ 
                slug: generatedSlug,
                urlId: uid
            });
        
            const newUrl = await Url.create({ 
                _id: uid,
                slug: newSlug._id, 
                longUrl 
            });
            res.json({ shortUrl: `http://your-domain.com/${generatedSlug}` });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        }
    } 
    
    async redirectUrl(req, res) {
        const { slug } = req.params;
        // console.log("slug: " + slug + " --------------------------------------")
        
        try {
            const foundSlug = await Slug.findOne({ slug });
            const url = await Url.findOne({ _id: foundSlug.urlId });
            
            if (url) {
                url.visitCount += 1;
                
                const visitorInfo = {
                    location: req.ip,
                    device: useragent.parse(req.headers['user-agent']).toString(),
                };
                url.visitorDetails.push(visitorInfo);
                
                await url.save();
                
                console.log("Redirecting to: " + url.longUrl)
                res.redirect(url.longUrl);
            } else {
                res.status(404).json({ error: 'URL not found' });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async extractMetadata(req, res) {
        try {
            const { url } = req.body;
            const response = await axios.get(url);
            const html = response.data;
            
            const $ = cheerio.load(html);
            // console.log("Loaded the HTML --------------------------------------");

            // Extract the title
            const title = $('title').text();
            // console.log("title: " + title + " --------------------------------------");

            // Extract the image
            let image = null;
            const imgElement = $('meta[property="og:image"]').attr('content');
            if (imgElement) {
                image = imgElement;
            }
            // console.log("image: " + image + " --------------------------------------");

            // Extract the description
            let description = null;
            const descElement = $('meta[property="og:description"]').attr('content');
            if (descElement) {
                description = descElement;
            }
            // console.log("description: " + description + " --------------------------------------");

           // Create the response object
            const responseData = {
                title,
                image,
                description,
            };

            // Return the response
            res.json({
                success: true,
                data: responseData,
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: 'Failed to extract metadata' });
        }
    }

    
    startServer() {
        this.app.listen(3001, () => {
            console.log('Server is running on port 3001');
        });
    }
}

const app = new UrlShortenerApp();
app.startServer();
