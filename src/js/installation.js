const {detectOS, loadAssetInfo, setRadioSelectors} = require('./common');
const {jvmVariant, variant} = require('./common');
const {platform_metadata} = require('../json/config');

const loading = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const platformSelector = document.getElementById('platform-selector');

module.exports.load = () => {
  setRadioSelectors();

  loadAssetInfo(variant, jvmVariant, 'releases', 'latest', 'adoptopenjdk', buildInstallationHTML, () => {
    errorContainer.innerHTML = '<p>Error... no installation information has been found!</p>';
    loading.innerHTML = ''; // remove the loading dots
  });
};

function buildInstallationHTML(releasesJson) {
  // create an array of the details for each asset that is attached to a release
  const assetArray = releasesJson[0].binaries;

  const ASSETARRAY = [];

  // for each asset attached to this release, check if it's a valid binary, then add a download block for it...
  assetArray.forEach((eachAsset) => {
    const ASSETOBJECT = {};

    ASSETOBJECT.thisPlatform = eachAsset;

    let platform_official_name;
    if (eachAsset.heap_size == 'large') {
      platform_official_name = `${eachAsset.os}-${eachAsset.architecture}-${eachAsset.image_type}-large-heap`
    } else {
      platform_official_name = `${eachAsset.os}-${eachAsset.architecture}-${eachAsset.image_type}`
    }

    ASSETOBJECT.thisPlatformType = platform_official_name;
    ASSETOBJECT.thisPlatformExists = true;
    ASSETOBJECT.thisBinaryLink = eachAsset.package.link;
    ASSETOBJECT.thisBinaryFilename = eachAsset.package.name;
    ASSETOBJECT.thisChecksum = eachAsset.package.checksum;
    ASSETOBJECT.thisChecksumLink = eachAsset.package.checksum_link;
    ASSETOBJECT.thisChecksumFilename = `${eachAsset.package.name}.sha256.txt`,
    ASSETOBJECT.thisUnzipCommand = platform_metadata[0][eachAsset.os].installCommand.replace('FILENAME', ASSETOBJECT.thisBinaryFilename);
    ASSETOBJECT.thisChecksumCommand = platform_metadata[0][eachAsset.os].checksumCommand.replace('FILENAME', ASSETOBJECT.thisBinaryFilename);
    ASSETOBJECT.thisChecksumAutoCommandHint = platform_metadata[0][eachAsset.os].checksumAutoCommandHint

    const thisChecksumAutoCommand = platform_metadata[0][eachAsset.os].checksumAutoCommand
    let sha256FileName = ASSETOBJECT.thisChecksumLink;
    const separator = sha256FileName.lastIndexOf('/');
    if (separator > -1) {
      sha256FileName = sha256FileName.substring(separator + 1);
    }
    ASSETOBJECT.thisChecksumAutoCommand = thisChecksumAutoCommand.replace(
      /FILEHASHURL/g,
      ASSETOBJECT.thisChecksumLink
    ).replace(
      /FILEHASHNAME/g,
      sha256FileName
    ).replace(
      /FILENAME/g,
      ASSETOBJECT.thisBinaryFilename
    );

    const dirName = releasesJson[0].release_name + (eachAsset.image_type === 'jre' ? '-jre' : '');
    ASSETOBJECT.thisPathCommand = platform_metadata[0][eachAsset.os].pathCommand.replace('DIRNAME', dirName);

    if (ASSETOBJECT.thisPlatformExists) {
      ASSETARRAY.push(ASSETOBJECT);
    }
  });

  const template = Handlebars.compile(document.getElementById('template').innerHTML);
  document.getElementById('installation-template').innerHTML = template({htmlTemplate: ASSETARRAY});

  /*global hljs*/
  hljs.initHighlightingOnLoad();

  setInstallationPlatformSelector(ASSETARRAY);
  attachCopyButtonListeners();
  window.onhashchange = displayInstallPlatform;

  loading.innerHTML = ''; // remove the loading dots

  const installationContainer = document.getElementById('installation-container');
  installationContainer.className = installationContainer.className.replace(/(?:^|\s)hide(?!\S)/g, ' animated fadeIn ');
}

function attachCopyButtonListeners() {
  document.querySelectorAll('.copy-code-block').forEach(codeBlock => {
    const target = codeBlock.querySelector('code.cmd-block');
    codeBlock.querySelector('.copy-code-button')
      .addEventListener('click', () => copyElementTextContent(target));
  });
}

function displayInstallPlatform() {
  const platformHash = window.location.hash.substr(1);
  const thisPlatformInstallation = document.getElementById(`installation-container-${platformHash}`);
  unselectInstallPlatform();

  if (thisPlatformInstallation) {
    platformSelector.value = platformHash;
    thisPlatformInstallation.classList.remove('hide');
  } else {
    const currentValues = [];

    Array.from(platformSelector.options).forEach((eachOption) => {
      currentValues.push(eachOption.value);
    });

    platformSelector.value = 'unknown';
  }
}

function unselectInstallPlatform() {
  const platformInstallationDivs = document.getElementById('installation-container')
    .getElementsByClassName('installation-single-platform');
    
  for (let i = 0; i < platformInstallationDivs.length; i++) {
    platformInstallationDivs[i].classList.add('hide');
  }
}

function setInstallationPlatformSelector(thisReleasePlatforms) {
  if (!platformSelector) {
    return;
  }

  if (platformSelector.options.length === 1) {
    thisReleasePlatforms.forEach((eachPlatform) => {

      let platform_official_name;
        if (eachPlatform.thisPlatform.heap_size == 'large') {
        platform_official_name = `${eachPlatform.thisPlatform.os}-${eachPlatform.thisPlatform.architecture}-${eachPlatform.thisPlatform.image_type}-large-heap`
      } else {
        platform_official_name = `${eachPlatform.thisPlatform.os}-${eachPlatform.thisPlatform.architecture}-${eachPlatform.thisPlatform.image_type}`
      }

      const op = new Option();
      op.value = platform_official_name;
      op.text = platform_official_name;
      platformSelector.options.add(op);
    });
  }

  const OS = detectOS();

  if (OS && window.location.hash.length < 1) {
    platformSelector.value = OS.searchableName;
    window.location.hash = platformSelector.value.toLowerCase();
  }

  displayInstallPlatform();

  platformSelector.onchange = () => {
    window.location.hash = platformSelector.value.toLowerCase();
    displayInstallPlatform();
  };
}

function copyElementTextContent(target) {
  const text = target.textContent;
  const input = document.createElement('input');
  input.value = text;

  document.body.appendChild(input);
  input.select();

  document.execCommand('copy');
  alert('Copied to clipboard');

  document.body.removeChild(input);
}
