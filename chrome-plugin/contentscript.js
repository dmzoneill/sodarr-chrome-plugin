// https://github.com/dmzoneill/sodarr-chrome-plugin
class Sodarr {
  static instance = null
  static radarr = null
  static sonarr = null

  static host = window.location.host.indexOf(':') ? window.location.host.split(':')[0] : window.location.host
  static serviceEndpoint = 'http://' + Sodarr.host + ':35000'
  static updating_dom_timer = null
  static updating_dom_series_link_count = 0
  static vlc_logo = chrome.runtime.getURL('vlc.png') // eslint-disable-line
  static folder_logo = chrome.runtime.getURL('folder.png') // eslint-disable-line
  static loading_logo = chrome.runtime.getURL('loading.gif') // eslint-disable-line
  static error_logo = chrome.runtime.getURL('error.png') // eslint-disable-line
  static file_missing_indicators = ['Episode has not aired', 'Episode missing from disk']
  static linux = navigator.platform.toLowerCase().indexOf('linux') > -1 // eslint-disable-line
  static class_prefix = 'sodarr-'
  static id_prefix = 'sodarr-'
  static modified = false

  constructor () {
    Sodarr.instance = this
  }

  async debug (msg) {
    console.log('Sodarr: ' + msg)
  };

  async post_data (url, data) {
    let retry = 3
    let lastError = ''

    while (retry > 0) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          redirect: 'follow',
          body: 'video=' + data
        })
        return [true, response.text()]
      } catch (error) {
        // TypeError: Failed to fetch
        console.log('There was an error', error)
        retry = retry - 1
        lastError = error
      }

      await new Promise(r => setTimeout(r, 1000)) // eslint-disable-line
    }

    return [false, lastError]
  }

  create_image (id, src, size, title, cssClass) {
    const img = document.createElement('img')
    img.setAttribute('width', size)
    img.setAttribute('height', size)
    img.setAttribute('style', 'margin-left:' + size + '; cursor: pointer;')
    img.setAttribute('class', Sodarr.class_prefix + cssClass)
    img.setAttribute('title', title)
    img.setAttribute('src', src)
    if (id != null) img.setAttribute('id', Sodarr.class_prefix + id)
    return img
  }

  create_debug_link (size = '12px') {
    const debugLink = document.createElement('a')
    debugLink.href = 'https://github.com/dmzoneill/sodarr-chrome-plugin/blob/main/DEBUG.md'
    debugLink.target = '_blank'
    debugLink.appendChild(this.create_image('error', Sodarr.error_logo, size, 'Failed connecting to service, click here to debug', 'error'))
    return debugLink
  }

  remove_elements_by_class (className) {
    try {
      const elements = document.getElementsByClassName(Sodarr.class_prefix + className)
      while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0])
      }
    } catch (error) {
      this.debug(error.stack)
    }
  }

  remove_element_by_id (id) {
    try {
      const element = document.getElementById(Sodarr.id_prefix + id)
      if (element === undefined) {
        return
      }
      element.parentNode.removeChild(element)
    } catch (error) {
      this.debug(error.stack)
    }
  }

  async update_page () {
    Sodarr.sonarr.update()
    Sodarr.radarr.update()
  }

  async observe_page_changes () {
    Sodarr.sonarr = new Sonarr()
    Sonarr.instance = Sodarr.sonarr
    Sodarr.radarr = new Radarr()
    Radarr.instance = Sodarr.radarr

    const mutationCallback = () => {
      if (Sodarr.instance.modified) {
        return
      }
      Sodarr.instance.debug('Onload attach dom mutator observer')
      clearTimeout(Sodarr.instance.updating_dom_timer)
      Sodarr.instance.updating_dom_timer = setTimeout(Sodarr.instance.update_page, 150)
    }

    const mutationObserver = new MutationObserver(mutationCallback) // eslint-disable-line

    const config = {
      attributes: true,
      childList: true,
      subtree: true
    }

    mutationObserver.observe(document.documentElement, config)
  }
}

class Sonarr extends Sodarr {
  async open_episode (button, folder = false, nextSibling) {
    button.click()
    const modal = document.querySelectorAll("div[class*='Modal-modal']")

    if (modal.length === 0) return

    this.remove_element_by_id('error')

    const columns = modal[0].querySelectorAll("td[class*='TableRowCell-cell']")
    document.querySelectorAll("button[class*='ModalContent-closeButton']")[0].click()

    let parts = columns[0].innerText.split('/')
    parts.pop()
    parts = parts.join('/')

    const dst = folder ? parts : columns[0].innerText

    const res = await this.post_data(Sodarr.serviceEndpoint + '/open', encodeURIComponent(dst))

    this.remove_element_by_id('loading')

    if (res[0]) {
      this.debug('Opening video')
    } else {
      nextSibling.parentNode.insertBefore(this.create_debug_link(), nextSibling.nextSibling)
    }
  }

  async episode_clicked (event) {
    const loadimgImg = Sodarr.instance.create_image('loading', Sodarr.loading_logo, '12px', 'loading ...', 'loading')
    Sodarr.instance.modified = true
    event.currentTarget.imgPlay.parentNode.insertBefore(loadimgImg, event.currentTarget.imgPlay.nextSibling)
    Sonarr.instance.open_episode(event.currentTarget.episode, false, event.currentTarget.imgPlay)
    Sodarr.instance.modified = false
  }

  async folder_clicked (event) {
    Sonarr.instance.open_episode(event.currentTarget.episode, true)
  }

  async update () {
    const seriesEpisodes = document.querySelectorAll("button[class*='EpisodeTitleLink-link']")

    if (seriesEpisodes.length === Sodarr.updating_dom_series_link_count) return

    Sodarr.updating_dom_series_link_count = seriesEpisodes.length
    this.remove_elements_by_class('vlc')
    this.remove_elements_by_class('folder')

    const seriesPath = document.querySelectorAll("span[class*='SeriesDetails-path']")[0]
    seriesPath.addEventListener('click', async function () {
      await Sodarr.instance.post_data(Sodarr.serviceEndpoint + '/open', encodeURIComponent(seriesPath.innerText))
      Sodarr.instance.debug('clicked')
    })
    seriesPath.setAttribute('style', 'cursor: pointer;')
    seriesPath.setAttribute('title', 'Open folder ' + seriesPath.innerText)

    this.debug('Found series in the active tab')

    for (let i = 0; i < seriesEpisodes.length; i++) {
      const title = seriesEpisodes[i].parentNode.parentNode.nextSibling.nextSibling.querySelectorAll('span')

      if (Sodarr.file_missing_indicators.includes(title[0].title) !== false) {
        continue
      }

      const imgPlay = this.create_image('vlc', Sodarr.vlc_logo, '12px', Sodarr.linux ? 'Click to play' : navigator.platform + ' unsupported', 'vlc')
      imgPlay.imgPlay = imgPlay
      imgPlay.episode = seriesEpisodes[i]
      imgPlay.addEventListener('click', this.episode_clicked)
      seriesEpisodes[i].parentNode.insertBefore(imgPlay, seriesEpisodes[i].nextSibling)

      const imgFolder = this.create_image('folder', Sodarr.folder_logo, '12px', 'Open folder', 'folder')
      imgFolder.episode = seriesEpisodes[i]
      imgFolder.addEventListener('click', this.folder_clicked)
      seriesEpisodes[i].parentNode.insertBefore(imgFolder, seriesEpisodes[i].nextSibling)

      this.debug('Added play icon to episode')
    }
  }
}

class Radarr extends Sodarr {
  async movie_clicked (event) {
    try {
      Sodarr.modified = true
      Sodarr.instance.remove_element_by_id('error')
      Sodarr.instance.remove_element_by_id('loading')

      const target = document.querySelectorAll("span[class*='MovieDetails-links']")[0]

      target.appendChild(Sodarr.instance.create_image('loading', Sodarr.loading_logo, '18px', 'loading ...', 'loading'))
      const res = await Sodarr.instance.post_data(Sodarr.serviceEndpoint + '/open', encodeURIComponent(event.currentTarget.folder_path + '/' + event.currentTarget.file_path))
      Sodarr.instance.remove_element_by_id('loading')

      if (res[0]) {
        Sodarr.instance.debug('Opening video')
      } else {
        target.appendChild(Sodarr.instance.create_debug_link('18px'))
      }
      Sodarr.modified = false
    } catch (error) {
      Sodarr.instance.debug(error.stack)
      Sodarr.modified = false
    }
  }

  async update () {
    try {
      if (document.getElementById(Sodarr.class_prefix + 'film-link') !== undefined) {
        Sodarr.modified = false
        return
      }

      if (document.querySelectorAll("ul[class*='MovieDetails-tabList']")[0] === undefined) {
        Sodarr.modified = false
        return
      }

      Sodarr.modified = true
      this.remove_element_by_id('error')

      this.debug('Found films in the active tab')

      const movieDetails = document.querySelectorAll("ul[class*='MovieDetails-tabList']")[0]
      const tab = movieDetails.querySelectorAll('li')[2]

      tab.click()

      const moviePath = document.querySelectorAll("td[class*='MovieFileEditorRow-relativePath']")[0].innerText
      const selected = movieDetails.querySelectorAll('[aria-selected="true"]')[0]
      const path = document.querySelectorAll("span[class*='MovieDetails-path']")[0].innerText
      const target = document.querySelectorAll("span[class*='MovieDetails-links']")[0]

      if (moviePath.length === 0) {
        return
      }

      target.appendChild(this.create_image('film-link', Sodarr.vlc_logo, '18px', Sodarr.linux ? 'Click to play' : navigator.platform + ' unsupported', 'film-link'))
      const film = document.getElementById(Sodarr.id_prefix + 'film-link')
      film.folder_path = path
      film.file_path = moviePath
      film.addEventListener('click', this.movie_clicked)

      this.debug('attached to the onclick event')

      selected.click()
      Sodarr.modified = false
    } catch (error) {
      this.debug(error.stack)
      Sodarr.modified = false
    }
  }
}

window.onload = (new Sodarr()).observe_page_changes
