var ARCHIVEDATA;

// When releases page loads, run:
/* eslint-disable no-unused-vars */
function onArchiveLoad() {
  /* eslint-enable no-unused-vars */
  ARCHIVEDATA = new Object();
  populateArchive(); // populate the Archive page
}

// ARCHIVE PAGE FUNCTIONS

/* eslint-disable no-undef */
function populateArchive() {
  loadPlatformsThenData(function () {

    var handleResponse = function (response) {
      loadJSON(getRepoName(true, 'releases'), 'jck', function (response_jck) {
        var jckJSON = {}
        if (response_jck !== null) {
          jckJSON = JSON.parse(response_jck)
        }
        buildArchiveHTML(response, jckJSON);
      });
      return true;
    };

    loadAssetInfo(variant, jvmVariant, 'releases', 'latest', handleResponse, function () {
      // if there are no releases (beyond the latest one)...
      // report an error, remove the loading dots
      loading.innerHTML = '';
      errorContainer.innerHTML = '<p>There are no archived releases yet for ' + variant + ' on the ' + jvmVariant + ' jvm. See the <a href=\'./releases.html?variant=' + variant + '&jvmVariant=' + jvmVariant + '\'>Latest release</a> page.</p>';
    });
  });

}

function buildArchiveHTML(eachRelease, jckJSON) {
  var RELEASEARRAY = [];

  var RELEASEOBJECT = new Object();
  var ASSETARRAY = [];

  // set values for this release, ready to inject into HTML
  var publishedAt = eachRelease.timestamp;
  RELEASEOBJECT.thisReleaseName = eachRelease.release_name;
  RELEASEOBJECT.thisReleaseDay = moment(publishedAt).format('D');
  RELEASEOBJECT.thisReleaseMonth = moment(publishedAt).format('MMMM');
  RELEASEOBJECT.thisReleaseYear = moment(publishedAt).format('YYYY');
  RELEASEOBJECT.thisGitLink = ('https://github.com/AdoptOpenJDK/' + getRepoName(true, 'releases') + '/releases/tag/' + RELEASEOBJECT.thisReleaseName);

  // create an array of the details for each asset that is attached to this release
  var assetArray = eachRelease.binaries;

  // populate 'platformTableRows' with one row per binary for this release...
  assetArray.forEach(function(eachAsset) {
    var ASSETOBJECT = new Object();
    var nameOfFile = (eachAsset.binary_name);
    var uppercaseFilename = nameOfFile.toUpperCase(); // make the name of the asset uppercase

    ASSETOBJECT.thisPlatform = getSearchableName(uppercaseFilename); // get the searchableName, e.g. MAC or X64_LINUX.

    // firstly, check if the platform name is recognised...
    if(ASSETOBJECT.thisPlatform) {

      // if the filename contains both the platform name and the matching INSTALLER extension, add the relevant info to the asset object
      ASSETOBJECT.thisInstallerExtension = getInstallerExt(ASSETOBJECT.thisPlatform);

      ASSETOBJECT.thisBinaryExtension = getBinaryExt(ASSETOBJECT.thisPlatform); // get the file extension associated with this platform

      if(uppercaseFilename.indexOf(ASSETOBJECT.thisInstallerExtension.toUpperCase()) >= 0) {
        if(ASSETARRAY.length > 0){
          ASSETARRAY.forEach(function(asset){
            if(asset.thisPlatform === ASSETOBJECT.thisPlatform){
              ASSETARRAY.pop();
            }
          });
        }
        ASSETOBJECT.thisPlatformExists = true;
        ASSETOBJECT.thisInstallerExists = true;
        RELEASEOBJECT.installersExist = true;
        ASSETOBJECT.thisInstallerLink = eachAsset.binary_link;
        ASSETOBJECT.thisInstallerSize = Math.floor((eachAsset.binary_size)/1024/1024);
        ASSETOBJECT.thisOfficialName = getOfficialName(ASSETOBJECT.thisPlatform);
        ASSETOBJECT.thisBinaryExists = true;
        RELEASEOBJECT.binariesExist = true;
        ASSETOBJECT.thisBinaryLink = eachAsset.binary_link.replace(ASSETOBJECT.thisInstallerExtension, ASSETOBJECT.thisBinaryExtension);
        ASSETOBJECT.thisBinarySize = Math.floor((eachAsset.binary_size)/1024/1024);
        ASSETOBJECT.thisChecksumLink = eachAsset.checksum_link;

        ASSETOBJECT.thisPlatformOrder = getPlatformOrder(ASSETOBJECT.thisPlatform);
        if (Object.keys(jckJSON).length == 0) {
          ASSETOBJECT.thisVerified = false;
        } else {
          if (jckJSON[eachRelease.release_name] && jckJSON[eachRelease.release_name].hasOwnProperty(ASSETOBJECT.thisPlatform) ) {
            ASSETOBJECT.thisVerified = true;
          } else {
            ASSETOBJECT.thisVerified = false;
          }
          ASSETOBJECT.thisPlatformOrder = getPlatformOrder(ASSETOBJECT.thisPlatform);
        }
      }

      // secondly, check if the file has the expected file extension for that platform...
      // (this filters out all non-binary attachments, e.g. SHA checksums - these contain the platform name, but are not binaries)

      if(uppercaseFilename.indexOf(ASSETOBJECT.thisBinaryExtension.toUpperCase()) >= 0) {
        var installerExist = false;
        if(ASSETARRAY.length > 0){
          ASSETARRAY.forEach(function(asset){
            if(asset.thisPlatform === ASSETOBJECT.thisPlatform){
              installerExist = true;
            }
          });
        }
        if(!installerExist){
          // set values ready to be injected into the HTML
          ASSETOBJECT.thisPlatformExists = true;
          ASSETOBJECT.thisBinaryExists = true;
          RELEASEOBJECT.binariesExist = true;
          ASSETOBJECT.thisOfficialName = getOfficialName(ASSETOBJECT.thisPlatform);
          ASSETOBJECT.thisBinaryLink = (eachAsset.binary_link);
          ASSETOBJECT.thisBinarySize = Math.floor((eachAsset.binary_size)/1024/1024);
          ASSETOBJECT.thisChecksumLink = eachAsset.checksum_link;
          ASSETOBJECT.thisPlatformOrder = getPlatformOrder(ASSETOBJECT.thisPlatform);
          if (Object.keys(jckJSON).length == 0) {
            ASSETOBJECT.thisVerified = false;
          } else {
            if (jckJSON[eachRelease.release_name] && jckJSON[eachRelease.release_name].hasOwnProperty(ASSETOBJECT.thisPlatform) ) {
              ASSETOBJECT.thisVerified = true;
            } else {
              ASSETOBJECT.thisVerified = false;
            }
          }
        }
      }

      if(ASSETOBJECT.thisPlatformExists === true){
        ASSETARRAY.push(ASSETOBJECT);
      }
    }
  });

  ASSETARRAY = orderPlatforms(ASSETARRAY);

  RELEASEOBJECT.thisPlatformAssets = ASSETARRAY;
  RELEASEARRAY.push(RELEASEOBJECT);

  ARCHIVEDATA.htmlTemplate = RELEASEARRAY;
  var template = Handlebars.compile(document.getElementById('template').innerHTML);
  document.getElementById('archive-table-body').innerHTML = template(ARCHIVEDATA);

  setPagination();
  setTickLink();

  loading.innerHTML = ''; // remove the loading dots

  // show the archive list and filter box, with fade-in animation
  var archiveList = document.getElementById('archive-list');
  archiveList.className = archiveList.className.replace( /(?:^|\s)hide(?!\S)/g , ' animated fadeIn ' );
}

function setPagination() {
  var container = $('#pagination-container');
  var archiveRows = document.getElementById('archive-table-body').getElementsByClassName('release-row');
  var paginationArrayHTML = [];
  for (i = 0; i < archiveRows.length; i++) {
    paginationArrayHTML.push(archiveRows[i].outerHTML);
  }

  var options = {
    dataSource: paginationArrayHTML,
    pageSize: 5,
    callback: function (response) {

      var dataHtml = '';

      $.each(response, function (index, item) {
        dataHtml += item;
      });

      $('#archive-table-body').html(dataHtml);
    }
  };

  container.pagination(options);

  if(document.getElementById('pagination-container').getElementsByTagName('li').length <= 3){
    document.getElementById('pagination-container').classList.add('hide');
  }

  return container;
}
