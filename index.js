var glob = require('glob');
var fs = require('fs');
var path = require('path');
var {execSync} = require('child_process');
var moment = require('moment');

renameBadJsonExtensions();
mergePhotosAndVideos();

/*
 * Google export contains json files with bad json extension.
 * We need to rename them to be able later find appropriate json metadata file.
 */
function renameBadJsonExtensions() {
  let possibleJsonExtensions = ['jso', 'js', 'j'];

  let crippledJsonExtensions = glob.sync(
    `${process.cwd()}/**/*.{${possibleJsonExtensions.join(',')}}`,
  );
  if (crippledJsonExtensions.length) {
    console.log(
      `Found ${
        crippledJsonExtensions.length
      } wrong named JSON files. Fixing...`,
    );
    crippledJsonExtensions.forEach(filePath => {
      try {
        let fileContent = fs.readFileSync(filePath);
        // Validate if it is valid json file
        JSON.parse(fileContent);
        let newFilePath =
          path.dirname(filePath) +
          '/' +
          path.basename(filePath, path.extname(filePath)) +
          '.json';
        fs.renameSync(filePath, newFilePath);
      } catch (e) {}
    });
  }
}

function mergePhotosAndVideos() {
  let supportedFileTypes = [
    'cr2',
    'gif',
    'jpeg',
    'jpg',
    'm4v',
    'mov',
    'mp4',
    'nef',
    'png',
  ];

  var filesToProcess = glob.sync(
    `${process.cwd()}/**/*.{${supportedFileTypes.join(',')}}`,
  );

  let totalFiles = filesToProcess.length;

  filesToProcess.forEach((absoluteFilePath, index) => {
    let jsonMetadadata = getMetadataJson(absoluteFilePath);

    // console.log('--------------------------');
    // console.log(`Processing file ${index + 1} out of ${totalFiles}`);
    // console.log(`File: ${absoluteFilePath}`);
    // console.log(`New file name: ${newFileName}`);
  });
}

/*
 * Google probably hates us! Export archive contains multiple patterns for metadata file name.
 * This method should try some of them to find a json metadata file.
 */
function getMetadataJson(absoluteFilePath) {
  try {
    // e.g.: IMG_0028.jpeg.json
    let metadataFilePath = absoluteFilePath + '.json';
    let metadataJson = fs.readFileSync(metadataFilePath);
    return metadataJson;
  } catch (e) {}

  try {
    // e.g.: IMG_0028.json
    let metadataFilePath =
      absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('.')) +
      '.json';
    let metadataJson = fs.readFileSync(metadataFilePath);
    return metadataJson;
  } catch (e) {}

  try {
    // Edited files - e.g.: IMG_0028-edited.jpg -> IMG__0028.json
    let metadataFilePath =
      absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('-edited')) +
      path.extname(absoluteFilePath);
    let metadataJson = fs.readFileSync(metadataFilePath);
    return metadataJson;
  } catch (e) {}

  try {
    // Duplicate files - e.g.: IMG_0028(1).jpg -> IMG_0028.json
    let fileExtension = path.extname(absoluteFilePath);
    let fileNameWithoutExt = path.basename(absoluteFilePath, fileExtension);
    let metadataFileName = fileNameWithoutExt.replace(/\(\d+\)/, '') + '.json';
    let metadataFilePath =
      path.dirname(absoluteFilePath) + '/' + metadataFileName;
    let metadataJson = fs.readFileSync(metadataFilePath);
    return metadataJson;
  } catch (e) {}

  try {
    // Duplicate files but keep original extension - e.g.: IMG_0028(1).jpg -> IMG_0028.jpg.json
    let fileName = path.basename(absoluteFilePath);
    let metadataFileName = fileName.replace(/\(\d+\)/, '') + '.json';
    let metadataFilePath =
      path.dirname(absoluteFilePath) + '/' + metadataFileName;
    let metadataJson = fs.readFileSync(metadataFilePath);
    return metadataJson;
  } catch (e) {}

  console.error(`Metadata file not found for ${absoluteFilePath}`);
}
