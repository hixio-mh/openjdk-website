// prefix for assets (e.g. logo)

const {variants, platform_metadata} = require('../json/config');

// Enables things like 'lookup["X64_MAC"]'
const lookup = {};

let variant = module.exports.variant = getQueryByName('variant') || 'openjdk8';
let jvmVariant = module.exports.jvmVariant = getQueryByName('jvmVariant') || 'hotspot';

module.exports.getVariantObject = (variantName) => variants.find((variant) => variant.searchableName === variantName);

// gets the Supported Version WITH PATH when you pass in 'searchableName'
module.exports.getSupportedVersion = (searchableName) => lookup[searchableName].supported_version;

// This function returns an object containing all information about the user's OS.
// The OS info comes from the 'platforms' array, which in turn comes from 'config.json'.
// `platform` comes from `platform.js`, which should be included on the page where `detectOS` is used.
module.exports.detectOS = () => {

  /*global platform*/
  // Workaround for Firefox on macOS which is 32 bit only
  if (platform.os.family == 'OS X') {
    platform.os.architecture = 64
  }

  for (let os in platform_metadata[0]) {
      for (let architecture of platform_metadata[0][os].architectures) {
        if (architecture.osDetectionString.toUpperCase().includes(platform.os.family.toUpperCase()) && architecture.architecture.endsWith(platform.os.architecture)){
          architecture.os = os
          return architecture
        }
    }
  }
  return null
}

module.exports.detectLTS = (version) => {
  for (let variant of variants) {
    if (variant.searchableName == version) {
      if (variant.lts == true) {
        return 'LTS'
      } else if (variant.lts == false ) {
        return null
      } else {
        return variant.lts
      }
    }
  }
}

function toJson(response) {
  while (typeof response === 'string') {
    try {
      response = JSON.parse(response)
    } catch (e) {
      return null
    }
  }
  return response
}

// load latest_nightly.json/nightly.json/releases.json/latest_release.json files
// This will first try to load from openjdk<X>-binaries repos and if that fails
// try openjdk<X>-release, i.e will try the following:

// https://github.com/AdoptOpenJDK/openjdk10-binaries/blob/master/latest_release.json
// https://github.com/AdoptOpenJDK/openjdk10-releases/blob/master/latest_release.json
function queryAPI(release, url, openjdkImp, vendor, errorHandler, handleResponse) {
  if ((!url.endsWith('?')) && (!url.endsWith('&'))) {
    url += '?';
  }
  if (release !== undefined) {
    url += `release=${release}&`;
  }
  if (openjdkImp !== undefined) {
    url += `jvm_impl=${openjdkImp}&`;
  }

  if (vendor !== undefined) {
    url += `vendor=${vendor}&`
  }

  if (vendor === 'openjdk') {
    url += 'page_size=1'
  }

  loadUrl(url, (response) => {
    if (response === null) {
      errorHandler();
    } else {
      handleResponse(toJson(response), false);
    }
  });
}

module.exports.loadAssetInfo = (variant, openjdkImp, releaseType, release, vendor, handleResponse, errorHandler) => {
  if (variant === 'amber') {
    variant = 'openjdk-amber';
  }
  
  if (releaseType == 'releases') {
    releaseType = 'ga'
  } else if (releaseType == 'nightly') {
    releaseType = 'ea'
  }

  let url = `https://api.adoptopenjdk.net/v3/assets/feature_releases/${variant.replace(/\D/g,'')}/${releaseType}`

  if (releaseType == 'ea') {
    url += '?page_size=100&'
  }

  queryAPI(release, url, openjdkImp, vendor, errorHandler, handleResponse);
}

module.exports.loadLatestAssets = (variant, openjdkImp, release, handleResponse, errorHandler) => {
  if (variant === 'amber') {
    variant = 'openjdk-amber';
  }
  const url = `https://api.adoptopenjdk.net/v3/assets/latest/${variant.replace(/\D/g,'')}/${openjdkImp}`;
  queryAPI(release, url, openjdkImp, 'adoptopenjdk', errorHandler, handleResponse);
}

function loadUrl(url, callback) {
  const xobj = new XMLHttpRequest();
  xobj.open('GET', url, true);
  xobj.onreadystatechange = () => {
    if (xobj.readyState == 4 && xobj.status == '200') { // if the status is 'ok', run the callback function that has been passed in.
      callback(xobj.responseText);
    } else if (
      xobj.status != '200' && // if the status is NOT 'ok', remove the loading dots, and display an error:
      xobj.status != '0') { // for IE a cross domain request has status 0, we're going to execute this block fist, than the above as well.
      callback(null)
    }
  };
  xobj.send(null);
}

// build the menu twisties
module.exports.buildMenuTwisties = () => {
  const submenus = document.getElementById('menu-content').getElementsByClassName('submenu');

  for (let i = 0; i < submenus.length; i++) {
    const twisty = document.createElement('span');
    const twistyContent = document.createTextNode('>');
    twisty.appendChild(twistyContent);
    twisty.className = 'twisty';

    const thisLine = submenus[i].getElementsByTagName('a')[0];
    thisLine.appendChild(twisty);

    thisLine.onclick = function () {
      this.parentNode.classList.toggle('open');
    }
  }
}

// builds up a query string (e.g. "variant=openjdk8&jvmVariant=hotspot")
const makeQueryString = module.exports.makeQueryString = (params) => {
  return Object.keys(params).map((key) => key + '=' + params[key]).join('&');
}

 module.exports.setUrlQuery = (params) => {
  window.location.search = makeQueryString(params);
}

function getQueryByName(name) {
  const url = window.location.href;
  const regex = new RegExp('[?&]' + name.replace(/[[]]/g, '\\$&') + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);

  if (!results) return null;
  if (!results[2]) return '';

  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

module.exports.persistUrlQuery = () => {
  const links = Array.from(document.getElementsByTagName('a'));
  const link = (window.location.hostname !== 'localhost' ? 'https://' : '') + window.location.hostname;

  links.forEach((eachLink) => {
    if (eachLink.href.includes(link)) {
      if (eachLink.href.includes('#')) {
        const anchor = '#' + eachLink.href.split('#').pop();
        eachLink.href = eachLink.href.substr(0, eachLink.href.indexOf('#'));
        if (eachLink.href.includes('?')) {
          eachLink.href = eachLink.href.substr(0, eachLink.href.indexOf('?'));
        }
        eachLink.href = eachLink.href + window.location.search + anchor;
      } else {
        eachLink.href = eachLink.href + window.location.search;
      }
    }
  });
}

module.exports.setRadioSelectors = () => {
  const jdkSelector = document.getElementById('jdk-selector');
  const jvmSelector = document.getElementById('jvm-selector');
  const listedVariants = [];

  function createRadioButtons(name, group, variant, element) {
    if (!listedVariants.length || !listedVariants.some((aVariant) => aVariant === name)) {
      const btnLabel = document.createElement('label');
      btnLabel.setAttribute('class', 'btn-label');

      const input = document.createElement('input');
      input.setAttribute('type', 'radio');
      input.setAttribute('name', group);
      input.setAttribute('value', name);
      input.setAttribute('class', 'radio-button');
      input.setAttribute('lts', variant.lts)

      btnLabel.appendChild(input);

      if (group === 'jdk') {
        if (variant.lts === true){
          btnLabel.innerHTML += `<span>${variant.label} (LTS)</span>`;
        } else if (variant.lts === 'latest') {
          btnLabel.innerHTML += `<span>${variant.label} (Latest)</span>`;
        } else {
          btnLabel.innerHTML += `<span>${variant.label}</span>`;
        }
      } else {
        btnLabel.innerHTML += `<span>${variant.jvm}</span>`;
      }

      element.appendChild(btnLabel);
      listedVariants.push(name);
    }
  }

  for (let x = 0; x < variants.length; x++) {
    const splitVariant = variants[x].searchableName.split('-');
    const jdkName = splitVariant[0];
    const jvmName = splitVariant[1];
    createRadioButtons(jdkName, 'jdk', variants[x], jdkSelector);
    if (jvmSelector) {
      createRadioButtons(jvmName, 'jvm', variants[x], jvmSelector);
    }
  }

  const jdkButtons = document.getElementsByName('jdk');
  const jvmButtons = document.getElementsByName('jvm');

  jdkSelector.onchange = () => {
    const jdkButton = Array.from(jdkButtons).find((button) => button.checked);
    module.exports.setUrlQuery({
      variant: jdkButton.value.match(/(openjdk\d+|amber)/)[1],
      jvmVariant
    });
  };

  if (jvmSelector) {
    jvmSelector.onchange = () => {
      const jvmButton = Array.from(jvmButtons).find((button) => button.checked);
      module.exports.setUrlQuery({
        variant,
        jvmVariant: jvmButton.value.match(/([a-zA-Z0-9]+)/)[1]
      });
    };
  }

  for (let i = 0; i < jdkButtons.length; i++) {
    if (jdkButtons[i].value === variant) {
      jdkButtons[i].setAttribute('checked', 'checked');
      break;
    }
  }

  for (let i = 0; i < jvmButtons.length; i++) {
    if (jvmButtons[i].value === jvmVariant) {
      jvmButtons[i].setAttribute('checked', 'checked');
      break;
    }
  }
}

global.renderChecksum = function(checksum) {
  var modal = document.getElementById('myModal')
  document.getElementById('modal-body').innerHTML = checksum
  modal.style.display = 'inline'
}

global.hideChecksum = function() {
  var modal = document.getElementById('myModal')
  modal.style.display = 'none'
}

global.copyStringToClipboard = function() {
  document.getElementById('modal-body').select()
  document.execCommand('copy');
}
