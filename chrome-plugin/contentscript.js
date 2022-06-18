var service_endpoint = "http://localhost:35000/open";
var updating_dom_timer = null;
var updating_dom_series_link_count = 0;
var vlc_logo = chrome.runtime.getURL("vlc.png");
var file_missing_indicators = ['Episode has not aired', 'Episode missing from disk'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const postData = async function(url = '', data) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        redirect: 'follow',
        body: "video=" + data
    });
    return response.text();
}

const createImageLink = function(id = null, size = "12px") {
    let img = document.createElement('img');
    img.setAttribute("src", vlc_logo);
    img.setAttribute("width", size);
    img.setAttribute("height", size);
    img.setAttribute("style", "margin-left:" + size + "; cursor: pointer;");
    img.setAttribute("class", "vlc_button");
    if(id != null) img.setAttribute("id", id);
    return img;
}

const insertAfter = async function (newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

const removeElementsByClass = async function(className){
    const elements = document.getElementsByClassName(className);
    while(elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}

const open_episode = async function(button) {
    button.click();
    var modal = document.querySelectorAll("div[class*='Modal-modal']");

    if(modal.length == 0) return;

    var columns = modal[0].querySelectorAll("td[class*='TableRowCell-cell']");
    document.querySelectorAll("button[class*='ModalContent-closeButton']")[0].click();

    postData(service_endpoint, columns[0].innerText).then(data => {
        console.log(data);
    });
}

const update_page_episode_links = async function() {     
    var series_episodes = document.querySelectorAll("button[class*='EpisodeTitleLink-link']");

    if(series_episodes.length == updating_dom_series_link_count) return;
    
    updating_dom_series_link_count = series_episodes.length;
    removeElementsByClass("vlc_button");

    for (let i = 0; i < series_episodes.length; i++) {
        var title = series_episodes[i].parentNode.parentNode.nextSibling.nextSibling.querySelectorAll("span");
        if(file_missing_indicators.includes(title[0].title) == false) {
            var img = createImageLink();
            img.addEventListener("click", function() { open_episode(series_episodes[i]) });
            insertAfter(img, series_episodes[i]);
        }
    }
}

const update_movie = async function() {
    if(document.getElementById("film_link") != null) return;

    var movie_details = document.querySelectorAll("ul[class*='MovieDetails-tabList']");
    if(movie_details.length == 0) return;

    var tabs = movie_details[0].querySelectorAll("li");
    var selected = movie_details[0].querySelectorAll('[aria-selected="true"]');
    tabs[2].click();
    var movie_path = document.querySelectorAll("td[class*='MovieFileEditorRow-relativePath']");
    
    if(movie_path.length == 0) return;

    var path = document.querySelectorAll("span[class*='MovieDetails-path']");
    var target = document.querySelectorAll("span[class*='MovieDetails-links']");
    target[0].innerHTML += createImageLink("film_link", "16px").outerHTML;
    document.getElementById("film_link").addEventListener("click", function() { 
        postData(service_endpoint, path[0].innerText + "/" + movie_path[0].innerText).then(data => {
            console.log(data);
        });
    });

    selected[0].click();
}

const update_page = async function() {
    update_page_episode_links();
    update_movie();
}

const observePageChanges = async function() {
    var mutationObserver = new MutationObserver(function () {
        clearTimeout(updating_dom_timer);
        updating_dom_timer = setTimeout(update_page, 150);
    });

    mutationObserver.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
    });
}

window.onload = observePageChanges;
