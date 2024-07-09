import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { compareVersions } from 'compare-versions';

function orderByVersion(a, b) {
  if (a.added === b.added) {
    if (a.removed === b.removed) {
      return a.title.localeCompare(b.title);
    }
    return compareVersions(b.removed ?? '99.99', a.removed ?? '99.99');
  }
  return compareVersions(b.added, a.added);
}

const featureFiles = readdirSync('./features/').filter((file) => file.endsWith('.json')).map((file) => `./features/${file}`);
const features = featureFiles.reduce((carry, file) => {
  carry.push(JSON.parse(readFileSync(file).toString()));
  return carry;
}, []).sort(orderByVersion);

const dom = await JSDOM.fromFile('src/index.html');
const document = dom.window.document;
document.getElementById('features-json').innerHTML = JSON.stringify(features);

writeFileSync('dist/index.html', dom.serialize());
