/* 
This should be used as a post-build step after Parcel has built the client 
to add the Pug files back to the distribution directory and update them with proper 
script and link tags that refer to compiled versions in the distribution 
directory. These are the steps:

1. Figure out where Parcel put the compiled versions of .css files and client-side
   .ts scripts in the distribution directory.
2. Replace in each Pug file the references to the .ts scripts and .css files by 
   their compiled pathnames in the distribution directory. 
3. Copy each Pug file to the proper subfolder in the distribution directory. 
4. Handle the included Pug files in such a way that script and link tags are removed, and 
   instead copied to the top-level Pug file by steps 1-3, but everything else is retained.

This way Pug files can be referred to in the server code and be rendered dynamically
with res.render(...)! 

Caution: This Pug workaround for Parcel is fragile. It is not perfect and may not work in 
all cases. 
- It assumes all top-level Pug sources are stored in the client/views directory.
- Any Pug sources included in the the top-level Pug files are stored in the 
  client/views/includes directory.
- It handles only script and link tags that refer to .ts and .css files, respectively. 
  These files need to be loaded in the head section. 
- The workaround will not work without adaptation for other tags or loaded files with 
  other extensions, including .js. 
- It works with current Parcel configuration and settings that compile stylesheets
  into .css and TS scripts into .js in a specific way. 
- Parcel client-side targets must be specified in the package.json file, and should include
  all the top-level Pug files, but not the included Pug files.
*/

/* const fs = require('fs');
const { get } = require('jquery');
const path = require('path'); */

import fs from 'fs';
import { get } from 'jquery';
import path from 'path';

// Define the directories: change these if your app has a different build structure.
// Source Pug directory where original Pug files are located.
const pugSource = 'client/views';
const pugSourceIncludes = 'client/views/includes';
const distDir = '.dist';
const pugTarget = distDir + '/' + pugSource;
const pugTargetIncludes = distDir + '/' + pugSourceIncludes;
const pugSourceDir = path.join(__dirname, '..', pugSource);
const pugSourceIncludesDir = path.join(__dirname, '..', pugSourceIncludes);
// Pug subfolder in the distibution directory where compiled Pug files should be placed.
// Should normally parallel the source Pug directory in the distribution directory.
const pugTargetDir = path.join(__dirname, '..', pugTarget);
const pugTargetIncludesDir = path.join(__dirname, '..', pugTargetIncludes);
/*
 Helper functions to extract the correct file references from the compiled HTML 
 file after Parcel has compiled them: these are the file references that were 
 copied by Parcel to the distribution directory.
*/

// Get all the matches for a given regex for a given group
interface MatchOptions {
  regex: RegExp;
  content: string;
  group?: number;
}

function getMatches({ regex, content, group = 1 }: MatchOptions): string[] {
  let match: RegExpExecArray | null;
  const matches: string[] = [];
  while ((match = regex.exec(content)) !== null) {
    // Get the specified group of the match
    matches.push(match[group]);
  }
  return matches;
}

/* 
   Function to extract the file references from the compiled HTML file in the 
   distribution directory.
*/
function extractFileRefsFromCompiledHTML(
  htmlFileName: string,
  buildDir = pugTargetDir
) {
  const htmlFilePath = path.join(buildDir, `${htmlFileName}.html`);
  let htmlContent: string;
  try {
    htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const cssRegex = /<link\s+(.*?href\s*=\s*["'][^"^']*\.css["'].*?)>/g;
    const jsRegex = /<script\s+(.*?src\s*=\s*["']([^"]*\.js)["'].*?)>/g;
    const imgRegex =
      /<img\s+(.*?src\s*=\s*["']([^"]*\.(png|jpg|jpeg|gif|svg))["'].*?)>/g;
    return {
      css: getMatches({ regex: cssRegex, content: htmlContent }),
      js: getMatches({ regex: jsRegex, content: htmlContent }),
      img: getMatches({ regex: imgRegex, content: htmlContent })
    };
  } catch (err) {
    console.error(`-- Compiled HTML file not found for ${htmlFileName}.html`);
    console.error(
      `   Make sure this file is a specified client target in package.json!`
    );
    return;
  }
}

/* This function looks for the compiled file reference in the original Pug file.
   Search is based on the file name, but it succeeds only if Parcel 
   retains the original file names and just adds an alphanumeric extension
   to them. However sometimes this is not the case due to the bundling
   process because compiled scripts can be refactored and shared by
   multiple pages. This function is used in fixing img tags in pug files. 
   Use it with caution: it's fragile. 
*/
export function findOriginalRef(
  pugContent: string,
  fileReference: string,
  tag: string
): { orig: string; ref: string } {
  let ref = '';
  let ext = '';
  if (tag === 'script') {
    ref = 'src';
    ext = 'js';
  } else if (tag === 'link') {
    ref = 'href';
    ext = 'css';
  } else if (tag === 'img') {
    ref = 'src';
    ext = '(png|jpg|jpeg|gif|svg)';
  } else {
    return { orig: '', ref: '' };
  }
  const originalRefRegexString = `${ref}\\s*=\\s*["'](\\/?(.+)\\.[a-z0-9]+\\.${ext})["']`;
  const originalRefRegex = new RegExp(originalRefRegexString);
  const match = originalRefRegex.exec(fileReference);
  if (match) {
    const refFilePath = match[1];
    const origFileWithExt = match[2] + '.' + match[3];
    const refRegEx = new RegExp(
      `${tag}\\s*\\(\\s*${ref}\\s*=\\s*["'](.+${origFileWithExt})["'].+$`,
      'm'
    );
    const found = pugContent.match(refRegEx);
    const origFilePath = found ? found[1] : '';
    return { orig: origFilePath, ref: refFilePath };
  }
  return { orig: '', ref: '' };
}

/*
  Function to remove the script and link tags in the Pug content.
*/
function removeTagsFromPugContent(
  pugContent: string,
  options: { tag: string; regex: RegExp; indentStr: string }
) {
  const { tag, regex, indentStr } = options;
  console.log(`-- Removing ${tag} tags from included file!`);
  let match;
  const matches: string[] = [];
  // Find the matches first to print them on console.
  while ((match = regex.exec(pugContent)) !== null) {
    // Get the second group of the match
    matches.push(match[0]);
  }
  if (matches.length === 0) {
    console.log(`-- No ${tag} tags found to be removed!`);
  } else {
    pugContent = pugContent.replace(regex, '');
    console.log(`-- Removed these ${tag} tags from included file...`);
    matches.forEach((match) => {
      console.log('   >> ' + match);
    });
  }
  return pugContent;
}

/* 
  Function to replace the script and link tags in the Pug content by
  the references to the compiled files in the distribution directory. 
*/
function replaceTagsInPugContent(
  pugContent: string,
  refs: string[],
  options: { tag: string; indentStr: string; markerText: string; regex: RegExp }
) {
  const { tag, indentStr, markerText, regex } = options;
  if (refs.length > 0) {
    const markerRegexGlobal = new RegExp(indentStr + markerText + '\n', 'g');
    const markerRegexFirstMatch = new RegExp(markerText);
    console.log(`-- ${refs.length} ${tag} tag(s) found to fix!`);
    // Replace the link tags with the marker text
    pugContent = pugContent.replace(regex, markerText);
    // Compose the compiled link tags as one unit, with right indentation.
    let tags = '';
    // Walk through the file references and add them to the replacement string.
    for (let i = 0; i < refs.length; i++) {
      const fileRef = refs[i];
      // if (!findOriginalRef(origPugContent, fileRef, tag)) continue; // not used, unreliable
      tags = tags + tag + '(' + fileRef + ')';
      if (i < refs.length - 1) tags = tags + '\n' + indentStr;
    }
    console.log('-- Fixed ' + tag + ' tags as follows...');
    if (markerRegexFirstMatch.test(pugContent)) {
      console.log('-- Replacing...');
      // Replace the first marker text with the compiled link tags.
      pugContent = pugContent.replace(markerRegexFirstMatch, tags);
      // Replace the remaining marker text with nothing, removing the tags.
      pugContent = pugContent.replace(markerRegexGlobal, '');
    } else {
      console.log('-- Adding...');
      // Add the tags after the include section with right indentation
      const includeRegex = /(include.+)$/m;
      pugContent = pugContent.replace(includeRegex, `$1\n${indentStr + tags}`);
    }
    console.log(indentStr + tags);
  } else {
    console.log('-- No ' + tag + ' tags found to fix!');
  }
  return pugContent;
}

/* 
  Function to fix the Pug content by replacing the references in script and 
  link tags in the content by the references to the compiled files in the 
  distribution directory if replace option is true. If replace option is false,
  then it removes the tags from the included file.
*/
function fixPugContent(
  pugContent: string,
  options: {
    tag: string;
    refs: string[];
    replace: boolean;
    markerText: string;
    indentStr: string;
  }
) {
  // The tag option is either 'link' or 'script'.
  const { tag, refs, replace, markerText, indentStr } = options;
  const tagRegex = new RegExp(tag + '\\(.*?\\)', 'g');
  if (!replace)
    return removeTagsFromPugContent(pugContent, {
      tag: tag,
      regex: tagRegex,
      indentStr: indentStr
    });
  return replaceTagsInPugContent(pugContent, refs, {
    tag: tag,
    indentStr: indentStr,
    markerText: markerText,
    regex: tagRegex
  });
}

function replaceImgTagsInPugContent(pugContent: string, refs: string[]) {
  if (refs.length > 0) {
    console.log('-- Fixed img' + ' tags as follows...');
    // Walk through the file references and add them to the replacement string.
    for (let i = 0; i < refs.length; i++) {
      const fileRef = refs[i];
      console.log('    ' + fileRef);
      const originalRef = findOriginalRef(pugContent, fileRef, 'img');
      if (!originalRef) continue;
      console.log(
        '    replacing img source "' +
          originalRef.orig +
          '" with "' +
          originalRef.ref +
          '"'
      );
      pugContent = pugContent.replace(originalRef.orig, originalRef.ref);
    }
  } else {
    console.log('-- No img tags found to fix!');
  }
  return pugContent;
}

function fixPugContentForImgTags(pugContent: string, refs: string[]) {
  return replaceImgTagsInPugContent(pugContent, refs);
}

function processTopLevelPugFiles() {
  let pugFiles: string[];
  try {
    pugFiles = fs
      .readdirSync(pugSourceDir)
      .filter((file) => file.endsWith('.pug'));
  } catch (err) {
    console.error('Pug source directory ' + pugSourceDir + ' not found!');
    return;
  }
  pugFiles.forEach((pugFileName) => {
    console.log('Processing top-level ' + pugFileName + '...');
    const fileReferences = extractFileRefsFromCompiledHTML(
      pugFileName.replace('.pug', ''),
      pugTargetDir
    );
    if (fileReferences) {
      const pugFilePath = path.join(pugSourceDir, pugFileName);
      // Copy the updated Pug file to the distribution directory.
      const outputFilePath = path.join(pugTargetDir, pugFileName);
      fs.copyFileSync(pugFilePath, outputFilePath);
      let pugContent = fs.readFileSync(outputFilePath, 'utf8');
      // Regex for the first-level indentation string in a Pug file.
      // let indentRegex = /^[\s\t]+/m;
      const indentRegex = /^[\s\t]+(?=script\(|link\(|include|title)/m;
      // First-level indentation string in a Pug file.
      const match = pugContent.match(indentRegex);
      const tagIndent = match ? match[0] : '';
      // Define a marker text for tags to be replaced.
      const markerText = 'XXXXXXXX';
      /* 
        Fix the Pug content by replacing the references in script and link tags
        in the Pug content with the references to the compiled files in the 
        distribution directory.
      */
      pugContent = fixPugContent(pugContent, {
        tag: 'link',
        refs: fileReferences.css,
        replace: true,
        markerText: markerText,
        indentStr: tagIndent
      });
      pugContent = fixPugContent(pugContent, {
        tag: 'script',
        refs: fileReferences.js,
        replace: true,
        markerText: markerText,
        indentStr: tagIndent
      });
      pugContent = fixPugContentForImgTags(pugContent, fileReferences.img);

      // Write the updated Pug content to the distribution directory.
      fs.writeFileSync(outputFilePath, pugContent, 'utf8');
      console.log('-- Updated ' + pugTarget + '/' + pugFileName);
    } else {
      console.error(
        `-- Compiled .js, .css, or .img files not found for ${pugFileName}`
      );
      console.error(
        `   Make sure you have run 'npm build' to have Parcel to compile them!`
      );
    }
  });
  console.log('Top-level Pug templates updated and copied to ' + pugTargetDir);
}

function processIncludedPugFiles() {
  let pugFiles;
  try {
    pugFiles = fs
      .readdirSync(pugSourceIncludesDir)
      .filter((file) => file.endsWith('.pug'));
  } catch (err) {
    console.log(
      'Pug includes directory ' + pugSourceIncludesDir + ' not found!'
    );
    console.log('Skipping processing of included files!');
    return;
  }
  if (!fs.existsSync(pugTargetIncludesDir)) {
    try {
      fs.mkdirSync(pugTargetIncludesDir, { recursive: true });
      console.log('Pug includes folder created in the distribution directory!');
    } catch (error) {
      console.error(
        'Pug includes folder could not be created in the distribution directory!'
      );
    }
  } else {
    console.log(
      'Pug includes folder already exists in the distribution directory!'
    );
  }
  pugFiles.forEach((pugFileName) => {
    console.log('Processing included ' + pugFileName + '...');
    const pugFilePath = path.join(pugSourceIncludesDir, pugFileName);
    // Copy the updated Pug file to the distribution directory.
    const outputFilePath = path.join(pugTargetIncludesDir, pugFileName);
    fs.copyFileSync(pugFilePath, outputFilePath);
    let pugContent = fs.readFileSync(outputFilePath, 'utf8');
    // Regex for the first-level indentation string in a Pug file.
    const indentRegex = /^[\s\t]+/m;
    // First-level indentation string in a Pug file.
    const match = pugContent.match(indentRegex);
    const level1Indent = match ? match[0] : '';
    // Define a marker text for tags to be replaced.
    pugContent = fixPugContent(pugContent, {
      tag: 'link',
      refs: [],
      replace: false,
      indentStr: level1Indent,
      markerText: ''
    });
    pugContent = fixPugContent(pugContent, {
      tag: 'script',
      refs: [],
      replace: false,
      markerText: '',
      indentStr: level1Indent
    });
    // Write the updated Pug content to the distribution directory.
    fs.writeFileSync(outputFilePath, pugContent, 'utf8');
    console.log('-- Updated ' + pugTargetIncludes + '/' + pugFileName);
  });
  console.log(
    'Included Pug templates updated and copied to ' + pugTargetIncludesDir
  );
}

export function buildForPug() {
  console.log('Pug source directory: ' + pugSourceDir);
  console.log('Pug output directory: ' + pugTargetDir);
  console.log('Pug source includes directory: ' + pugSourceIncludesDir);
  console.log('Pug output includes directory: ' + pugTargetIncludesDir);
  processTopLevelPugFiles();
  processIncludedPugFiles();
}
