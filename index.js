const glob = require('glob');
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const moment = require('moment');

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
  // All lowercase
  let extensions = [
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
  extensions = extensions.concat(extensions.map(type => type.toUpperCase()));

  let filesToProcess = glob.sync(
    `${process.cwd()}/**/*.{${extensions.join(',')}}`,
  );

  filesToProcess.forEach((absoluteFilePath, index) => {
    console.log('--------------------------');

    let jsonMetadadata = getMetadataJson(absoluteFilePath);
    if (!jsonMetadadata) {
      console.error(`Metadata file not found for ${absoluteFilePath}. Skipping...`);
      return;
    }

    let timestamp = (jsonMetadadata.photoTakenTime || {}).timestamp;
    if (!timestamp) {
      console.error(`Can't find timestamp field for ${absoluteFilePath}. Skipping...`);
      return;
    }

    console.log(`${index + 1}/${filesToProcess.length}: ${absoluteFilePath}`);

    // DateTimeOriginal EXIF tag format 
    // see https://www.awaresystems.be/imaging/tiff/tifftags/privateifd/exif/datetimeoriginal.html
    let dateTimeOriginal = moment
      // moment uses timestamp in ms
      .utc(timestamp * 1000)
      .format('YYYY:MM:DD HH:mm:ss');
    
    // 'AllDates' EXIF tag is used to overwrite all data related tags
    // see http://owl.phy.queensu.ca/~phil/exiftool/TagNames/Shortcuts.html
    let exiftoolCmd = `exiftool -AllDates="${dateTimeOriginal}" "${absoluteFilePath}"`;

    execSync(exiftoolCmd);

    
    // modify gps exif info
  });
}

/*
 * Google probably hates us! Export archive contains multiple patterns for metadata file name.
 * This method should try some of them to find a json metadata file.
 */
function getMetadataJson(absoluteFilePath) {
  try {
    // e.g.: IMG_0028.jpeg -> IMG_0028.jpeg.json
    let metadataFilePath = absoluteFilePath + '.json';
    let metadataJson = fs.readFileSync(metadataFilePath);
    return JSON.parse(metadataJson);
  } catch (e) {}

  try {
    // e.g.: IMG_0028.jpeg -> IMG_0028.json
    let metadataFilePath =
      absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('.')) +
      '.json';
    let metadataJson = fs.readFileSync(metadataFilePath);
    return JSON.parse(metadataJson);
  } catch (e) {}

  try {
    // Edited files - e.g.: IMG_0028-edited.jpg -> IMG__0028.json
    let metadataFilePath =
      absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('-edited')) + '.json';
    let metadataJson = fs.readFileSync(metadataFilePath);
    return JSON.parse(metadataJson);
  } catch (e) {}

  try {
    // Edited files but keep original extension - e.g.: IMG_0028-edited.JPG -> IMG__0028.JPG.json
    let metadataFilePath =
      absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('-edited')) +
      path.extname(absoluteFilePath) + '.json';
    let metadataJson = fs.readFileSync(metadataFilePath);
    return JSON.parse(metadataJson);
  } catch (e) {}

  try {
    // Duplicate files - e.g.: IMG_0028(1).jpg -> IMG_0028.json
    let fileExtension = path.extname(absoluteFilePath);
    let fileNameWithoutExt = path.basename(absoluteFilePath, fileExtension);
    let metadataFileName = fileNameWithoutExt.replace(/\(\d+\)/, '') + '.json';
    let metadataFilePath =
      path.dirname(absoluteFilePath) + '/' + metadataFileName;
    let metadataJson = fs.readFileSync(metadataFilePath);
    return JSON.parse(metadataJson);
  } catch (e) {}

  try {
    // Duplicate files but keep original extension - e.g.: IMG_0028(1).jpg -> IMG_0028.jpg.json
    let fileName = path.basename(absoluteFilePath);
    let metadataFileName = fileName.replace(/\(\d+\)/, '') + '.json';
    let metadataFilePath =
      path.dirname(absoluteFilePath) + '/' + metadataFileName;
    let metadataJson = fs.readFileSync(metadataFilePath);
    return JSON.parse(metadataJson);
  } catch (e) {}

  return null;
}
