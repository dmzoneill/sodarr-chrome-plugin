class Sodarr {

    static instance = null;
    static radarr = null;
    static sonarr = null;

    static host = window.location.host.indexOf(":") ? window.location.host.split(":")[0] : window.location.host;
    static service_endpoint = "http://" + Sodarr.host + ":35000";
    static updating_dom_timer = null;
    static updating_dom_series_link_count = 0;
    static vlc_logo = chrome.runtime.getURL("vlc.png");
    static folder_logo = chrome.runtime.getURL("folder.png");
    static loading_logo = chrome.runtime.getURL("loading.gif");
    static error_logo = chrome.runtime.getURL("error.png");
    static file_missing_indicators = ['Episode has not aired', 'Episode missing from disk'];
    static linux = navigator.platform.toLowerCase().indexOf('linux') > -1 ? true : false;
    static class_prefix = "sodarr-";
    static id_prefix = "sodarr-";
    static modified = false;

    constructor() {
        Sodarr.instance = this;
    }

    async debug(msg) {
        console.log("Sodarr: " + msg);
    };

    async post_data(url, data) {
        let retry = 3;
        let last_error = "";

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

    create_image(id, src, size, title, css_class) {
        let img = document.createElement('img');
        img.setAttribute("width", size);
        img.setAttribute("height", size);
        img.setAttribute("style", "margin-left:" + size + "; cursor: pointer;");
        img.setAttribute("class", Sodarr.class_prefix + css_class);
        img.setAttribute("title", title)
        img.setAttribute("src", src);
        if (id != null) img.setAttribute("id", Sodarr.class_prefix + id);
        return img;
    }

    create_debug_link(size = "12px") {
        var debugLink = document.createElement('a');
        debugLink.href = "https://github.com/dmzoneill/sodarr-chrome-plugin/blob/main/DEBUG.md";
        debugLink.target = "_blank";
        debugLink.appendChild(this.create_image("error", Sodarr.error_logo, size, "Failed connecting to service, click here to debug", "error"));
        return debugLink;
    }

    remove_elements_by_class(className) {
        try {
            const elements = document.getElementsByClassName(Sodarr.class_prefix + className);
            while (elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }
        } catch (error) {
            this.debug(error.stack);
        }
    }

    remove_element_by_id(id) {
        try {
            var element = document.getElementById(Sodarr.id_prefix + id);
            if (element == undefined) {
                return;
            }
            element.parentNode.removeChild(element);
        } catch (error) {
            this.debug(error.stack);
        }
    }

    async update_page() {
        Sodarr.sonarr.update();
        Sodarr.radarr.update();
    }

    async observe_page_changes() {
        Sodarr.sonarr = new Sonarr();
        Sonarr.instance = Sodarr.sonarr;
        Sodarr.radarr = new Radarr();
        Radarr.instance = Sodarr.radarr;

        const mutation_callback = () => {
            if (Sodarr.instance.modified) {
                return;
            }
            Sodarr.instance.debug("Onload attach dom mutator observer");
            clearTimeout(Sodarr.instance.updating_dom_timer);
            Sodarr.instance.updating_dom_timer = setTimeout(Sodarr.instance.update_page, 150);
        }

        let mutationObserver = new MutationObserver(mutation_callback);

        let config = {
            attributes: true,
            childList: true,
            subtree: true,
        }

        mutationObserver.observe(document.documentElement, config);
    }
}


class Sonarr extends Sodarr {
    async open_episode(button, folder = false, nextSibling) {
        button.click();
        let modal = document.querySelectorAll("div[class*='Modal-modal']");

        if (modal.length == 0) return;

        this.remove_element_by_id("error");

        let columns = modal[0].querySelectorAll("td[class*='TableRowCell-cell']");
        document.querySelectorAll("button[class*='ModalContent-closeButton']")[0].click();

        let parts = columns[0].innerText.split("/");
        parts.pop();
        parts = parts.join("/");

        let dst = folder ? parts : columns[0].innerText;

        let res = await this.post_data(Sodarr.service_endpoint + "/open", dst);

        this.remove_element_by_id("loading");

        if (res[0]) {
            this.debug("Opening video");
        } else {
            nextSibling.parentNode.insertBefore(this.create_debug_link(), nextSibling.nextSibling);
        }
    }

    async episode_clicked(event) {
        let loadimg_img = Sodarr.instance.create_image("loading", Sodarr.loading_logo, "12px", "loading ...", "loading");
        Sodarr.instance.modified = true;
        event.currentTarget.img_play.parentNode.insertBefore(loadimg_img, event.currentTarget.img_play.nextSibling);
        Sonarr.instance.open_episode(event.currentTarget.episode, false, event.currentTarget.img_play);
        Sodarr.instance.modified = false;
    }

    async folder_clicked(event) {
        Sonarr.instance.open_episode(event.currentTarget.episode, true);
    }

    async update() {
        let series_episodes = document.querySelectorAll("button[class*='EpisodeTitleLink-link']");

        if (series_episodes.length == Sodarr.updating_dom_series_link_count) return;

        Sodarr.updating_dom_series_link_count = series_episodes.length;
        this.remove_elements_by_class("vlc");
        this.remove_elements_by_class("folder");

        let series_path = document.querySelectorAll("span[class*='SeriesDetails-path']")[0];
        series_path.addEventListener("click", async function () {
            let res = await Sodarr.instance.post_data(service_endpoint + "/open", series_path.innerText);
            Sodarr.instance.debug("clicked");
        });
        series_path.setAttribute("style", "cursor: pointer;");
        series_path.setAttribute("title", "Open folder " + series_path.innerText);

        this.debug("Found series in the active tab");

        for (let i = 0; i < series_episodes.length; i++) {
            let title = series_episodes[i].parentNode.parentNode.nextSibling.nextSibling.querySelectorAll("span");

            if (Sodarr.file_missing_indicators.includes(title[0].title) != false) {
                continue;
            }

            let img_play = this.create_image("vlc", Sodarr.vlc_logo, "12px", Sodarr.linux ? "Click to play" : navigator.platform + " unsupported", "vlc");
            img_play.img_play = img_play;
            img_play.episode = series_episodes[i];
            img_play.addEventListener("click", this.episode_clicked);
            series_episodes[i].parentNode.insertBefore(img_play, series_episodes[i].nextSibling);

            let img_folder = this.create_image("folder", Sodarr.folder_logo, "12px", "Open folder", "folder");
            img_folder.episode = series_episodes[i];
            img_folder.addEventListener("click", this.folder_clicked);
            series_episodes[i].parentNode.insertBefore(img_folder, series_episodes[i].nextSibling);

            this.debug("Added play icon to episode");
        }
    }
}

class Radarr extends Sodarr {
    async movie_clicked(event) {
        try {
            Sodarr.modified = true;
            Sodarr.instance.remove_element_by_id("error");
            Sodarr.instance.remove_element_by_id("loading");

            let target = document.querySelectorAll("span[class*='MovieDetails-links']")[0];

            target.appendChild(Sodarr.instance.create_image("loading", Sodarr.loading_logo, "18px", "loading ...", "loading"));
            let res = await Sodarr.instance.post_data(Sodarr.service_endpoint + "/open", event.currentTarget.folder_path + "/" + event.currentTarget.file_path);
            Sodarr.instance.remove_element_by_id("loading");

            if (res[0]) {
                Sodarr.instance.debug("Opening video");
            } else {
                target.appendChild(Sodarr.instance.create_debug_link("18px"));
            }
            Sodarr.modified = false;
        } catch (error) {
            Sodarr.instance.debug(error.stack);
            Sodarr.modified = false;
        }
    }

    async update() {
        try {
            if (document.getElementById(Sodarr.class_prefix + 'film-link') != undefined) {
                Sodarr.modified = false;
                return;
            }

            if (document.querySelectorAll("ul[class*='MovieDetails-tabList']")[0] == undefined) {
                Sodarr.modified = false;
                return;
            }

            Sodarr.modified = true;
            this.remove_element_by_id("error");

            this.debug("Found films in the active tab");

            let movie_details = document.querySelectorAll("ul[class*='MovieDetails-tabList']")[0];
            let tab = movie_details.querySelectorAll("li")[2];

            tab.click();

            let movie_path = document.querySelectorAll("td[class*='MovieFileEditorRow-relativePath']")[0].innerText;
            let selected = movie_details.querySelectorAll('[aria-selected="true"]')[0];
            let path = document.querySelectorAll("span[class*='MovieDetails-path']")[0].innerText;
            let target = document.querySelectorAll("span[class*='MovieDetails-links']")[0];

            if (movie_path.length == 0) {
                return;
            }

            target.appendChild(this.create_image("film-link", Sodarr.vlc_logo, "18px", Sodarr.linux ? "Click to play" : navigator.platform + " unsupported", "film-link"));
            let film = document.getElementById(Sodarr.id_prefix + "film-link");
            film.folder_path = path;
            film.file_path = movie_path;
            film.addEventListener("click", this.movie_clicked);

            this.debug("attached to the onclick event");

            selected.click();
            Sodarr.modified = false;
        } catch (error) {
            this.debug(error.stack);
            Sodarr.modified = false;
        }
    }
}

window.onload = (new Sodarr()).observe_page_changes;
