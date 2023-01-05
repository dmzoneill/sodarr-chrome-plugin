let service_endpoint = "http://localhost:35000";
let updating_dom_timer = null;
let updating_dom_series_link_count = 0;
let vlc_logo = chrome.runtime.getURL("vlc.png");
let folder_logo = chrome.runtime.getURL("folder.png");
let file_missing_indicators = ['Episode has not aired', 'Episode missing from disk'];

const post_data = async function(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        redirect: 'follow',
        body: "video=" + data
    });
    return response.text();
}

const create_image_link = function(id = null, size = "12px") {
    let img = document.createElement('img');
    img.setAttribute("src", vlc_logo);
    img.setAttribute("width", size);
    img.setAttribute("height", size);
    img.setAttribute("style", "margin-left:" + size + "; cursor: pointer;");
    img.setAttribute("class", "vlc_button");
    if(id != null) img.setAttribute("id", id);
    return img;
}

const create_folder_link = function(id = null, size = "14px") {
    let img = document.createElement('img');
    img.setAttribute("src", folder_logo);
    img.setAttribute("width", size);
    img.setAttribute("height", size);
    img.setAttribute("style", "margin-left:" + size + "; cursor: pointer;");
    img.setAttribute("class", "folder_button");
    return img;
}

const insert_after = async function (newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

const remove_elements_by_class = async function(className){
    const elements = document.getElementsByClassName(className);
    while(elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}

const open_episode = async function(button, folder = false) {
    button.click();
    let modal = document.querySelectorAll("div[class*='Modal-modal']");

    if(modal.length == 0) return;

    let columns = modal[0].querySelectorAll("td[class*='TableRowCell-cell']");
    document.querySelectorAll("button[class*='ModalContent-closeButton']")[0].click();

    let parts = columns[0].innerText.split("/");
    parts.pop();
    parts = parts.join("/");

    let dst = folder ? parts : columns[0].innerText;

    post_data(service_endpoint + "/open", dst).then(data => {
        console.log(data);
    });
}

const update_series = async function() {     
    let series_episodes = document.querySelectorAll("button[class*='EpisodeTitleLink-link']");

    if(series_episodes.length == updating_dom_series_link_count) return;
    
    updating_dom_series_link_count = series_episodes.length;
    remove_elements_by_class("vlc_button");
    remove_elements_by_class("folder_button");

    let series_path = document.querySelectorAll("span[class*='SeriesDetails-path']")[0];
    series_path.addEventListener("click", function() {
        post_data(service_endpoint + "/open", series_path.innerText).then(data => {
            console.log(data);
        });
    });
    series_path.setAttribute("style", "cursor: pointer;");
    series_path.setAttribute("title", "Open folder " + series_path.innerText);

    for (let i = 0; i < series_episodes.length; i++) {
        let title = series_episodes[i].parentNode.parentNode.nextSibling.nextSibling.querySelectorAll("span");
        if(file_missing_indicators.includes(title[0].title) == false) {
            let img_play = create_image_link();
            img_play.addEventListener("click", function() {
                open_episode(series_episodes[i]); 
            });
            insert_after(img_play, series_episodes[i]);

            let img_folder = create_folder_link();
            img_folder.addEventListener("click", function() { 
                open_episode(series_episodes[i], true);    
            });
            insert_after(img_folder, series_episodes[i]);
        }
    }
}

const update_movie = async function() {
    if(document.getElementById("film_link") != null) return;

    let movie_details = document.querySelectorAll("ul[class*='MovieDetails-tabList']");
    if(movie_details.length == 0) return;

    let tabs = movie_details[0].querySelectorAll("li");
    let selected = movie_details[0].querySelectorAll('[aria-selected="true"]');
    tabs[2].click();
    let movie_path = document.querySelectorAll("td[class*='MovieFileEditorRow-relativePath']");
    
    if(movie_path.length == 0) return;

    let path = document.querySelectorAll("span[class*='MovieDetails-path']");
    let target = document.querySelectorAll("span[class*='MovieDetails-links']");
    target[0].innerHTML += create_image_link("film_link", "16px").outerHTML;
    document.getElementById("film_link").addEventListener("click", function() { 
        post_data(service_endpoint + "/open", path[0].innerText + "/" + movie_path[0].innerText).then(data => {
            console.log(data);
        });
    });

    selected[0].click();
}

const update_page = async function() {
    update_series();
    update_movie();
}

const observe_page_changes = async function() {
    let mutationObserver = new MutationObserver(function () {
        clearTimeout(updating_dom_timer);
        updating_dom_timer = setTimeout(update_page, 150);
    });

    mutationObserver.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
    });
}

window.onload = observe_page_changes;
