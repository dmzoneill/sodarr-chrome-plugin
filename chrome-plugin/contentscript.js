var radarrurl = "http://192.168.0.30:7878/movie/";
var sonarrurl = "http://192.168.0.30:8989/series/";
var vlc_logo = chrome.runtime.getURL("vlc.png");
const sleep = ms => new Promise(r => setTimeout(r, ms));

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

async function postData(url = '', data) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: "video=" + data
    });
    return response.text();
}

function xdg_open(path) {
    postData('http://localhost:35000/open', path).then(data => {
        console.log(data);
    });
}

function open_episode(button) {
    button.click();
    var modal = document.querySelectorAll("div[class*='Modal-modal']");
    if(modal.length ==0) {
        console.log("Modal never appeared?");
        return;
    }
    var columns = modal[0].querySelectorAll("td[class*='TableRowCell-cell']");
    console.log(columns);
    var video_path = columns[0].innerText;
    console.log(video_path);
    document.querySelectorAll("button[class*='ModalContent-closeButton']")[0].click();
    xdg_open(video_path);
}

function removeElementsByClass(className){
    const elements = document.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}

const update_page_episode_links = async function() {    
    var series_episodes = [];      
    console.log(series_episodes);

    removeElementsByClass("vlc_button");
    
    while(series_episodes.length == 0) {
        console.log("No episode links");
        await sleep(200);
        series_episodes = document.querySelectorAll("button[class*='EpisodeTitleLink-link']");
    }

    console.log("Episodes links " + series_episodes.toString());

    for (let i = 0; i < series_episodes.length; i++) {
        var title = series_episodes[i].parentNode.parentNode.nextSibling.nextSibling.querySelectorAll("span");
        if(title[0].title.indexOf("Episode has not aired") == -1) {
            let img = document.createElement('img');
            img.setAttribute("src", vlc_logo);
            img.setAttribute("width", "12");
            img.setAttribute("height", "12");
            img.setAttribute("style", "margin-left:12px; cursor: pointer;");
            img.setAttribute("class", "vlc_button");
            img.addEventListener("click", function() { open_episode(series_episodes[i]) });
            insertAfter(img, series_episodes[i]);
        }
    }
}

const update_movie = async function() {    
    var movie_path = [];      
    
    while(movie_path.length == 0) {
        console.log("No movie path");
        movie_path = document.querySelectorAll("td[class*='MovieFileEditorRow-relativePath']");
        await sleep(300);
    }

    console.log("Movie link " + movie_path[0].innerText);
    var path = document.querySelectorAll("span[class*='MovieDetails-path']");
    console.log(path);

    console.log(path[0].innerText);
    console.log(movie_path[0].innerText);
    var movie_full_path = path[0].innerText + "/" + movie_path[0].innerText;

    let img = document.createElement('img');
    img.setAttribute("src", vlc_logo);
    img.setAttribute("width", "12");
    img.setAttribute("height", "12");
    img.setAttribute("style", "margin-left:12px; cursor: pointer;");
    img.setAttribute("id", "film_link");
    img.setAttribute("class", "vlc_button");
    movie_path[0].innerHTML += img.outerHTML;
    document.getElementById("film_link").addEventListener("click", function() { xdg_open(movie_full_path); });
}

const subscribe_episode_expander = async function() {
    console.log("Add click listeners");

    var expander_buttons = [];

    while(expander_buttons.length == 0) {
        console.log("No expander buttons");
        expander_buttons = document.querySelectorAll("button[class*='SeriesDetailsSeason-expandButton']");
        await sleep(100);
    }

    console.log(expander_buttons);

    for (let i = 0; i < expander_buttons.length; i++) {
        console.log("Add click listener");
        expander_buttons[i].addEventListener("click", function() { update_page_episode_links() });
    }
}

const page_setup = async function() {
    console.log("Page loaded");

    if(window.location.href.includes(sonarrurl)) {
        console.log("subscribe click");
        subscribe_episode_expander();
        update_page_episode_links();
    }

    if(window.location.href.includes(radarrurl)) {
        console.log("subscribe click");
        update_movie();
    }
}

window.onload = function() {
    /*
    var mutationObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          console.log(mutation);
        });
    });

    mutationObserver.observe(document.documentElement, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
        attributeOldValue: true,
        characterDataOldValue: true
    });
    */

    page_setup();
};

console.log("Started");
