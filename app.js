/*
 * to install: 
 * 
 * npm i fs.promises.exists
 * npm i selenium-webdriver
 * 
 */ 

const {WebDriver, Builder, Browser, By, Key, until} = require('selenium-webdriver');
let chrome = require('selenium-webdriver/chrome');
const cookieParser = require('cookie-parser');
const fs = require('fs/promises');
const fsExists = require( 'fs.promises.exists');
 
const GOOGLE_HOME_URL = 'https://www.google.com';
const GOOGLE_FIND_URL = 'https://www.google.com/android/find';

const COOKIE_FILE = './findmyphone-google-cookie.json';


/* these are the initial cookies needed for proper login. however, since the credentials present in this file are not valid for ever cookies needs to be refreshed (while logged in)
 * 
 */ 
const COOKIES = '';
 

class FindMyPhone {
    constructor() {
        let service = new chrome.ServiceBuilder('/usr/lib/chromium-browser/chromedriver')
            .build();
        let options = new chrome.Options();
        options.headless();
        this.driver = chrome.Driver.createSession(options, service);
    }
    
    close() {
        this.driver.quit();
    }
    
    /* this function checks whether user is logged in by checking whether LOGIN button
     * is present in google.com webpage
     */ 
    async isLoggedIn() {
        try {
            let title = await this.driver.getTitle();
            if ( ! title.includes('Google') ) {
                return false;
            }
            
            let loginBtn = await fmp.driver.findElements(By.xpath("//a[contains(@href,'ServiceLogin')]"));
            return (loginBtn.length == 0);
        } 
        catch (err) {
            console.error(err);
            return false;
        }
    }
    
    /* this function takes cookies (saved in variable COOKIE) and adds 
     * them to driver's cookies
     */ 
    async initializeCookies(new_cookies) {
        try {
            let cookies = new_cookies.split(';');
            for (let cookie of cookies) {
                let parts = cookie.split('=');
                
                if (parts[0][0] == ' ') {
                    parts[0] = parts[0].slice(1);    
                }
                if (parts[1][0] == ' ') {
                    parts[1] = parts[1].slice(1);    
                }
                await fmp.driver.manage().addCookie({name: parts[0], value: parts[1]});
            }
            await this.refreshPage();
            if ( await this.isLoggedIn() ) {
                await this.saveCookies();
            }
            return true;
        }
        catch(err) {
            console.error(err);
            return false;
        }
    }
    
    
    /* this function saves cookies obtained from browser (hence might be updated by google server) to file          specified in COOKIE_FILE. Those cookies will
     */ 
    async saveCookies() {
        try {
            console.log('Saving cookies from file...');
            let cookies = await this.driver.manage().getCookies();  
            //console.log(cookies);
            await fs.writeFile(COOKIE_FILE, JSON.stringify(cookies));
            return true;
        }
        catch(err) {
            console.error(err);
            return false;
        }
    }
    
    
    /* this function loads the cookies from COOKIE_FILE (if exist) and 
     * adds them to the driver, then refreshes the page 
     */ 
    async loadCookies() {
        try {
            console.log('Loading cookies from file...');
            let fileExists = await fsExists(COOKIE_FILE, true);
            if ( ! fileExists ) {
                console.error("Cannot load cookies: Cookie file does not exist.")
                return;
            }
            
            let cookies_json = await fs.readFile(COOKIE_FILE);
            let cookies = JSON.parse(cookies_json);
            for (let cookie of cookies) {
                await fmp.driver.manage().addCookie({name: cookie.name, value: cookie.value});
            }
            await this.refreshPage();
        }
        catch(err) {
            console.error(err)
        }
    }
    
    async refreshPage() {
        try {
            await this.driver.navigate().refresh();
        }
        catch (err) {
            console.error(err);
        }
    }
    
    async navigateHome() {
        try {
            await this.driver.navigate().to(GOOGLE_HOME_URL);
        }
        catch (err) {
            console.error(err);
        }
    }
    
    async navigateFind() {
        try {
            await this.driver.navigate().to(GOOGLE_FIND_URL);
        }
        catch (err) {
            console.error(err);
        }
    }
    
    
    /* this function refreshes the cookies
     * 
     * pseudocode:
     * is user logged in? 
     *      if not, check if cookie file exists
     *          if cookie file exists, load from cookies from file -> driver
     *      refresh page
     * 
     * then check another time:
     * is user logged in?
     *      if so, save cookies driver -> file
     *      if not, load cookies from user provided init-cookies -> driver, then refresh page, check another time if user is logged in. if so, save cookies, if not, print error message
     */ 
    async refreshCookies() {
        try {
            await this.navigateHome();
            
            if ( await this.isLoggedIn() ) {
                this.loadCookies();
            }
            
            
            if ( await this.isLoggedIn() ) {
                await this.loadCookies();
                await this.saveCookies();
                console.log("Run refreshCookies() successfully.");
            }
            else {
                console.log("User is not logged in.");
                if (await !this.initializeCookies(COOKIES)) {
                    console.error('Failed to login to Google Find My Phone. Update your cookies!');
                }
            }
            
            
        }
        catch (err) {
            console.error(err);
        }
    }
    
    async ring() {
       
        await this.navigateFind();
        
        let btn = await this.driver.findElements(By.className('ring-dialog-open'));
        
        if (btn.length > 0) {
            console.log("FOUND RING BUTTON...");
            await btn[0].click();
        }
        else {
            console.error("Something went wrong... Found multiple web elements with class name 'ring-dialog-open'.");
        }
    }

} // end class FindMyPhone

 
async function rule_refreshCookies(fmp) {
     await fmp.refreshCookies();
     await fmp.driver.sleep(25000);
     await fmp.close();
}
 
async function rule_ring(fmp) {
     await fmp.refreshCookies();
     await fmp.driver.sleep(3000);
     await fmp.ring();
     await fmp.driver.sleep(25000);
     await fmp.close();
}
 
 
 

const myArgs = process.argv.slice(2);

let fmp = new FindMyPhone;

if (myArgs[0] == 'refresh') {
    rule_refreshCookies(fmp)
        .then( () => {
            console.log("Done.");
        })
        .catch( (err) => {
            console.error(err);
        })
}
else if (myArgs[0] == 'ring') {
    rule_ring(fmp)
        .then( () => {
            console.log("Done.");
        })
        .catch( (err) => {
            console.error(err);
        })
}
else {
    console.log("USAGE: app.js [ring | refresh]");
}
