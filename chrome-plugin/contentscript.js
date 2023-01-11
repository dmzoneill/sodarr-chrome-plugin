let host = window.location.host.indexOf(":") ? window.location.host.split(":")[0] : window.location.host;
let service_endpoint = "http://" + host + ":35000";
let updating_dom_timer = null;
let updating_dom_series_link_count = 0;
let vlc_logo = chrome.runtime.getURL("vlc.png");
let folder_logo = chrome.runtime.getURL("folder.png");
let loading_logo = chrome.runtime.getURL("loading.gif");
let error_logo = chrome.runtime.getURL("error.png");
let file_missing_indicators = ['Episode has not aired', 'Episode missing from disk'];
let linux = navigator.platform.toLowerCase().indexOf('linux') > -1 ? true : false;

let modified = false;

const debug = async function (msg) {
    console.log("Sodarr: " + msg);
};

const post_data = async function (url, data) {
    retry = 3;
    last_error = "";

    while (retry > 0) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                redirect: 'follow',
                body: "video=" + data
            });
            return [true, response.text()]
        } catch (error) {
            // TypeError: Failed to fetch
            console.log('There was an error', error);
            retry = retry - 1;
            last_error = error;
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    return [false, last_error]
}

const create_image = function (id = null, size = "12px", title = "") {
    let img = document.createElement('img');
    img.setAttribute("width", size);
    img.setAttribute("height", size);
    img.setAttribute("style", "margin-left:" + size + "; cursor: pointer;");
    img.setAttribute("class", "vlc_button");
    img.setAttribute("title", title)
    if (id != null) img.setAttribute("id", id);
    return img;
}

const create_vlc_image = function (id = null, size = "12px", title = "") {
    let img = create_image(id, size, title);
    img.setAttribute("class", "vlc_button");
    img.setAttribute("src", vlc_logo);
    if (id != null) img.setAttribute("id", id);
    return img;
}

const create_loading_image = function (id = null, size = "12px", title = "") {
    let img = create_image(id, size, title);
    img.setAttribute("class", "vlc_button");
    img.setAttribute("src", loading_logo);
    if (id != null) img.setAttribute("id", id);
    return img;
}

const create_error_image = function (id = null, size = "12px", title = "") {
    let img = create_image(id, size, title);
    img.setAttribute("class", "vlc_button");
    img.setAttribute("src", error_logo);
    if (id != null) img.setAttribute("id", id);
    return img;
}

const create_folder_link = function (id = null, size = "14px", title = "") {
    let img = create_image(id, "12px", size, title);
    img.setAttribute("class", "folder_button");
    img.setAttribute("src", folder_logo);
    if (id != null) img.setAttribute("id", id);
    return img;
}

const remove_elements_by_class = async function (className) {
    const elements = document.getElementsByClassName(className);
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}

const remove_element_by_id = async function (id) {
    try {
        var element = document.getElementById(id);
        element.parentNode.removeChild(element);
    } catch (err) {
        debug(err);
    }
}

const open_episode = async function (button, folder = false, nextSibling) {
    button.click();
    let modal = document.querySelectorAll("div[class*='Modal-modal']");

    if (modal.length == 0) return;

    remove_element_by_id("sodarr-error");

    let columns = modal[0].querySelectorAll("td[class*='TableRowCell-cell']");
    document.querySelectorAll("button[class*='ModalContent-closeButton']")[0].click();

    let parts = columns[0].innerText.split("/");
    parts.pop();
    parts = parts.join("/");

    let dst = folder ? parts : columns[0].innerText;

    let res = await post_data(service_endpoint + "/open", dst);

    remove_element_by_id("sodarr-loading");    

    if (res[0]) {
        debug("Opening video");
    } else {
        var debugLink = document.createElement('a');
        debugLink.href = "https://github.com/dmzoneill/sodarr-chrome-plugin/blob/main/DEBUG.md";
        debugLink.target = "_blank";
        debugLink.appendChild(create_error_image("sodarr-error", "12px", "Failed connecting to service, click here to debug"));
        nextSibling.parentNode.insertBefore(debugLink, nextSibling.nextSibling);
    }
}

const update_series = async function () {
    let series_episodes = document.querySelectorAll("button[class*='EpisodeTitleLink-link']");

    if (series_episodes.length == updating_dom_series_link_count) return;

    updating_dom_series_link_count = series_episodes.length;
    remove_elements_by_class("vlc_button");
    remove_elements_by_class("folder_button");

    let series_path = document.querySelectorAll("span[class*='SeriesDetails-path']")[0];
    series_path.addEventListener("click", function () {
        post_data(service_endpoint + "/open", series_path.innerText).then(data => {
            debug("clicked");
        });
    });
    series_path.setAttribute("style", "cursor: pointer;");
    series_path.setAttribute("title", "Open folder " + series_path.innerText);

    debug("Found series in the active tab");

    for (let i = 0; i < series_episodes.length; i++) {
        let title = series_episodes[i].parentNode.parentNode.nextSibling.nextSibling.querySelectorAll("span");
        if (file_missing_indicators.includes(title[0].title) == false) {
            let img_play = create_vlc_image(null, "12px", linux ? "Click to play" : navigator.platform + " unsupported");
            img_play.addEventListener("click", function () {
                let loadimg_img = create_loading_image("sodarr-loading", "12px");
                modified = true;
                img_play.parentNode.insertBefore(loadimg_img, img_play.nextSibling);
                open_episode(series_episodes[i], false, img_play);
            });
            series_episodes[i].parentNode.insertBefore(img_play, series_episodes[i].nextSibling);

            let img_folder = create_folder_link();
            img_folder.addEventListener("click", function () {
                open_episode(series_episodes[i], true);
            });
            series_episodes[i].parentNode.insertBefore(img_folder, series_episodes[i].nextSibling);

            debug("Added play icon to episode");
        }
    }
}

const update_movie = async function () {
    if (document.getElementById("film_link") != null) return;

    let movie_details = document.querySelectorAll("ul[class*='MovieDetails-tabList']");
    if (movie_details.length == 0) return;

    debug("Found films in the active tab");

    let tabs = movie_details[0].querySelectorAll("li");
    let selected = movie_details[0].querySelectorAll('[aria-selected="true"]');
    tabs[2].click();
    let movie_path = document.querySelectorAll("td[class*='MovieFileEditorRow-relativePath']");

    if (movie_path.length == 0) return;

    let path = document.querySelectorAll("span[class*='MovieDetails-path']");
    let target = document.querySelectorAll("span[class*='MovieDetails-links']");
    target[0].innerHTML += create_vlc_image("film_link", "16px", linux ? "Click to play" : navigator.platform + " unsupported").outerHTML;
    document.getElementById("film_link").addEventListener("click", function () {
        post_data(service_endpoint + "/open", path[0].innerText + "/" + movie_path[0].innerText).then(data => {
            debug("clicked");
        });
    });

    debug("attached to the onclick event");

    selected[0].click();
}

const update_page = async function () {
    debug("Looking for series and films in the current tab");
    update_series();
    update_movie();
}

const observe_page_changes = async function () {
    let mutationObserver = new MutationObserver(function () {
        if (modified) {
            modified = false;
            return;
        }
        debug("Onload attach dom mutator observer");
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
