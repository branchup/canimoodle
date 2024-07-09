import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { compareVersions, compare } from 'compare-versions';

function getCompatibility(feature, version) {
  const isMet = compare(version, feature.added, '>=');
  const isRemoved = feature.removed && compare(version, feature.removed, '>=');
  const isDeprecated = feature.deprecated && compare(version, feature.deprecated, '>=');
  if (!isMet) {
    return false;
  }
  if (isDeprecated) {
    return 'deprecated';
  }
  return !isRemoved;
}

function orderByVersion(a, b) {
  if (a.added === b.added) {
    if (a.removed === b.removed) {
      return a.title.localeCompare(b.title);
    }
    return compareVersions(b.removed ?? '99.99', a.removed ?? '99.99');
  }
  return compareVersions(b.added, a.added);
}

const moodleVersions = ["3.11", "4.0", "4.1", "4.2", "4.3", "4.4", "4.5"];

const featureFiles = readdirSync('./features/').filter((file) => file.endsWith('.json')).map((file) => `./features/${file}`);
const features = featureFiles.reduce((carry, file) => {
  const feature = JSON.parse(readFileSync(file).toString());
  const compatibility = moodleVersions.reduce((carry, version) => {
    carry[version] = getCompatibility(feature, version);
    return carry;
  }, {});

  const available_in = Object.entries(compatibility).filter(([version, compat]) => compat === true).map(([version]) => version);
  const deprecated_in = Object.entries(compatibility).filter(([version, compat]) => compat === 'deprecated').map(([version]) => version);
  const unavailable_in = Object.entries(compatibility).filter(([version, compat]) => compat === false).map(([version]) => version);

  carry.push({
    ...feature,
    id: file.replace('.json', '').replace('./features/', ''),
    description_html: (feature.description ?? '').replace(/`([^`]+)`/g, '<code>$1</code>'),
    notes_html: (feature.notes ?? '').replace(/`([^`]+)`/g, '<code>$1</code>'),
    compatibility,
    available_in,
    deprecated_in,
    unavailable_in,
  });
  return carry;
}, []).sort(orderByVersion);

const dom = await JSDOM.fromFile('src/index.html');
const document = dom.window.document;
document.getElementById('features-json').innerHTML = JSON.stringify(features);
document.getElementById('versions-json').innerHTML = JSON.stringify(moodleVersions);

writeFileSync('dist/index.html', dom.serialize());
