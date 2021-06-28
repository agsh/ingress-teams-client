// ==UserScript==
// @id liveInventory
// @name IITC Plugin: Teams (Live Inventory)
// @category Info
// @version 0.0.1
// @namespace	https://github.com/agsh/ingress-teams-client
// @downloadURL	https://github.com/agsh/ingress-teams-client/raw/main/ingress.teams.user.js
// @updateURL	https://github.com/agsh/ingress-teams-client/raw/main/ingress.teams.user.js
// @homepageURL	https://github.com/agsh/ingress-teams-client
// @description Show current ingame inventory and keys from all team members
// @author EisFrei
// @author agsh
// @include		https://intel.ingress.com/*
// @match		https://intel.ingress.com/*
// @grant			none
// ==/UserScript==

function wrapper(plugin_info) {
  // Make sure that window.plugin exists. IITC defines it as a no-op function,
  // and other plugins assume the same.
  if (typeof window.plugin !== 'function') window.plugin = function () {};
  const KEY_SETTINGS = 'plugin-ingress-teams';
  let settings = {
    displayMode: 'icon',
    serverAddress: '',
    serverToken: '',
    serverAutoUpdate: '2',
    serverPerPage: '200',
  };
  const dateFormatter = new Intl.DateTimeFormat('ru', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });

  window.plugin.Teams = function () {};

  const thisPlugin = window.plugin.Teams;
  // Name of the IITC build for first-party plugins
  plugin_info.buildName = 'Teams';

  // Datetime-derived version of the plugin
  plugin_info.dateTimeVersion = '202106260430';

  // ID/name of the plugin
  plugin_info.pluginId = 'teams';

  const translations = {
    BOOSTED_POWER_CUBE: 'Hypercube',
    CAPSULE: 'Capsule',
    DRONE: 'Drone',
    EMITTER_A: 'Resonator',
    EMP_BURSTER: 'XMP',
    EXTRA_SHIELD: 'Aegis Shield',
    FLIP_CARD: 'Virus',
    FORCE_AMP: 'Force Amp',
    HEATSINK: 'HS',
    INTEREST_CAPSULE: 'Quantum Capsule',
    KEY_CAPSULE: 'Key Capsule',
    KINETIC_CAPSULE: 'Kinetic Capsule',
    LINK_AMPLIFIER: 'LA',
    MEDIA: 'Media',
    MULTIHACK: 'Multi-Hack',
    PLAYER_POWERUP: 'Apex',
    PORTAL_LINK_KEY: 'Key',
    PORTAL_POWERUP: 'Fracker',
    POWER_CUBE: 'PC',
    RES_SHIELD: 'Shield',
    TRANSMUTER_ATTACK: 'ITO -',
    TRANSMUTER_DEFENSE: 'ITO +',
    TURRET: 'Turret',
    ULTRA_LINK_AMP: 'Ultra-Link',
    ULTRA_STRIKE: 'US',
  };

  const CSS_STYLES = `
.plugin-live-inventory-count {
  font-size: 10px;
  color: #FFFFBB;
  font-family: monospace;
  text-align: center;
  text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;
  pointer-events: none;
  -webkit-text-size-adjust:none;
}
#live-inventory th {
  background-color: rgb(27, 65, 94);
  cursor: pointer;
}
#live-inventory-settings {
  margin-top: 2em;
}
#live-inventory-settings h2{
  line-height: 2em;
}
#live-inventory-settings--capsule-names{
  min-height: 50px;
  min-width: 400px;
}
#randdetails td.randdetails-capsules {
  white-space: normal;
}
#randdetails .randdetails-keys td,
#randdetails .randdetails-keys th {
  vertical-align: top;
}
#live-inventory-settings table,
#live-inventory-settings select,
#live-inventory-settings input, 
#live-inventory-key-table input {
  width: 100%;
}
#live-team {
  word-break: break-all;
}
#live-team-pages a {
  padding: 0 2px;
}
#live-team-pages a span {
  font-size: large;
  font-weight: bold;
}
#live-inventory-key-table thead {
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(8, 48, 78, 0.9);
}
`;

  const debounce = (fun, wait) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        fun(...args);
      }, wait);
    };
  };



  function checkSubscription(callback) {
    var versionStr = niantic_params.CURRENT_VERSION;
    var post_data = JSON.stringify({
      v: versionStr,
    });

    return $.ajax({
      url: '/r/getHasActiveSubscription',
      type: 'POST',
      data: post_data,
      context: {},
      dataType: 'json',
      success: [(data) => callback(null, data)],
      error: [(data) => callback(data)],
      contentType: 'application/json; charset=utf-8',
      beforeSend: function (req) {
        req.setRequestHeader('accept', '*/*');
        req.setRequestHeader('X-CSRFToken', readCookie('csrftoken'));
      },
    });
  }

  function addItemToCount(item, countMap, incBy) {
    if (item[2] && item[2].resource && item[2].timedPowerupResource) {
      const key = `${item[2].resource.resourceType} ${item[2].timedPowerupResource.designation}`;
      if (!countMap[key]) {
        countMap[key] = item[2].resource;
        countMap[key].count = 0;
        countMap[key].type = `Powerup ${
          translations[item[2].timedPowerupResource.designation] ||
          item[2].timedPowerupResource.designation
        }`;
      }
      countMap[key].count += incBy;
    } else if (item[2] && item[2].resource && item[2].flipCard) {
      const key = `${item[2].resource.resourceType} ${item[2].flipCard.flipCardType}`;
      if (!countMap[key]) {
        countMap[key] = item[2].resource;
        countMap[key].count = 0;
        countMap[key].type = `${translations[item[2].resource.resourceType]} ${
          item[2].flipCard.flipCardType
        }`;
      }
      countMap[key].flipCardType = item[2].flipCard.flipCardType;
      countMap[key].count += incBy;
    } else if (item[2] && item[2].resource) {
      const key = `${item[2].resource.resourceType} ${item[2].resource.resourceRarity}`;
      if (!countMap[key]) {
        countMap[key] = item[2].resource;
        countMap[key].count = 0;
        countMap[key].type = `${translations[item[2].resource.resourceType]}`;
      }
      countMap[key].count += incBy;
    } else if (item[2] && item[2].resourceWithLevels) {
      const key = `${item[2].resourceWithLevels.resourceType} ${item[2].resourceWithLevels.level}`;
      if (!countMap[key]) {
        countMap[key] = item[2].resourceWithLevels;
        countMap[key].count = 0;
        countMap[key].resourceRarity = 'COMMON';
        countMap[key].type = `${
          translations[item[2].resourceWithLevels.resourceType]
        } ${item[2].resourceWithLevels.level}`;
      }
      countMap[key].count += incBy;
    } else if (item[2] && item[2].modResource) {
      const key = `${item[2].modResource.resourceType} ${item[2].modResource.rarity}`;
      if (!countMap[key]) {
        countMap[key] = item[2].modResource;
        countMap[key].count = 0;
        countMap[key].type = `${
          translations[item[2].modResource.resourceType]
        }`;
        countMap[key].resourceRarity = countMap[key].rarity;
      }
      countMap[key].count += incBy;
    } else {
      console.log(item);
    }
  }

  function parseCapsuleNames(str) {
    const reg = new RegExp(/^([0-9a-f]{8}):(.+)$/, 'i');
    str = str || '';
    const map = {};
    str
      .split('\n')
      .map((e) => reg.exec(e))
      .filter((e) => e && e.length === 3)
      .forEach((e) => (map[e[1]] = e[2]));
    return map;
  }

  function svgToIcon(str, s) {
    const url = ('data:image/svg+xml,' + encodeURIComponent(str)).replace(
      /#/g,
      '%23'
    );
    return new L.Icon({
      iconUrl: url,
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      className: 'no-pointer-events', //allows users to click on portal under the unique marker
    });
  }

  function createIcons() {
    thisPlugin.keyIcon = svgToIcon(
      `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-key" width="44" height="44" viewBox="0 0 24 24" stroke-width="2" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round">
<circle cx="8" cy="15" r="4" />
<line x1="10.85" y1="12.15" x2="19" y2="4" />
<line x1="18" y1="5" x2="20" y2="7" />
<line x1="15" y1="8" x2="17" y2="10" />
</svg>`,
      15
    );
  }

  function prepareItemCounts(data) {
    if (!data || !data.result) {
      return [];
    }
    const countMap = {};
    data.result.forEach((item) => {
      addItemToCount(item, countMap, 1);
      if (item[2].container) {
        item[2].container.stackableItems.forEach((item) => {
          addItemToCount(
            item.exampleGameEntity,
            countMap,
            item.itemGuids.length
          );
        });
      }
    });
    const countList = Object.values(countMap);
    countList.sort((a, b) => {
      if (a.type === b.type) {
        return 0;
      }
      return a.type > b.type ? 1 : -1;
    });
    return countList;
  }

  function HexToSignedFloat(num) {
    let int = parseInt(num, 16);
    if ((int & 0x80000000) === -0x80000000) {
      int = -1 * (int ^ 0xffffffff) + 1;
    }
    return int / 10e5;
  }

  function addKeyToCount(item, countMap, incBy, moniker) {
    if (
      item[2] &&
      item[2].resource &&
      item[2].resource.resourceType &&
      item[2].resource.resourceType === 'PORTAL_LINK_KEY'
    ) {
      const key = `${item[2].portalCoupler.portalGuid}`;
      if (!countMap[key]) {
        countMap[key] = item[2];
        countMap[key].count = 0;
        countMap[key].capsules = [];
      }

      if (moniker && countMap[key].capsules.indexOf(moniker) === -1) {
        countMap[key].capsules.push(moniker);
      }

      countMap[key].count += incBy;
    }
  }

  function prepareKeyCounts(data) {
    if (!data || !data.result) {
      return [];
    }
    const countMap = {};
    data.result.forEach((item) => {
      addKeyToCount(item, countMap, 1);
      if (item[2].container) {
        item[2].container.stackableItems.forEach((item2) => {
          addKeyToCount(
            item2.exampleGameEntity,
            countMap,
            item2.itemGuids.length,
            item[2].moniker.differentiator
          );
        });
      }
    });
    const countList = Object.values(countMap);
    countList.sort((a, b) => {
      if (a.portalCoupler.portalTitle === b.portalCoupler.portalTitle) {
        return 0;
      }
      return a.portalCoupler.portalTitle.toLowerCase() >
        b.portalCoupler.portalTitle.toLowerCase()
        ? 1
        : -1;
    });
    return countList;
  }

  function getKeyTableBody(orderBy, direction) {
    const capsuleNames = parseCapsuleNames(settings.capsuleNames);

    const sortFunctions = {
      name: (a, b) => {
        if (a.portalCoupler.portalTitle === b.portalCoupler.portalTitle) {
          return 0;
        }
        return (
          (a.portalCoupler.portalTitle.toLowerCase() >
          b.portalCoupler.portalTitle.toLowerCase()
            ? 1
            : -1) * (direction ? 1 : -1)
        );
      },
      count: (a, b) => (a.count - b.count) * (direction ? 1 : -1),
      distance: (a, b) => (a._distance - b._distance) * (direction ? 1 : -1),
      capsule: (a, b) => {
        const sA = a.capsules.join(', ').toLowerCase();
        const sB = b.capsules.join(', ').toLowerCase();
        if (sA === sB) {
          return 0;
        }
        return (sA > sB ? 1 : -1) * (direction ? 1 : -1);
      },
    };

    thisPlugin.keyCount.sort(sortFunctions[orderBy]);
    return thisPlugin.keyCount
      .map((el) => {
        return `<tr>
<td><a href="//intel.ingress.com/?pll=${el._latlng.lat},${
  el._latlng.lng
}" onclick="zoomToAndShowPortal('${el.portalCoupler.portalGuid}',[${
  el._latlng.lat
},${el._latlng.lng}]); return false;">${
  el.portalCoupler.portalTitle
}</a></td>
<td>${el.count}</td>
<td>${el._formattedDistance}</td>
<td>${el.capsules.map((e) => capsuleNames[e] || e).join(', ')}</td>
</tr>`;
      })
      .join('');
  }

  function updateKeyTableBody(orderBy, direction) {
    $('#live-inventory-key-table tbody')
      .empty()
      .append($(getKeyTableBody(orderBy, direction)));
  }

  function getItemTableBody(orderBy, direction) {
    const sortFunctions = {
      type: (a, b) => {
        if (a.type === b.type) {
          return 0;
        }
        return (
          (a.type.toLowerCase() > b.type.toLowerCase() ? 1 : -1) *
          (direction ? 1 : -1)
        );
      },
      rarity: (a, b) => {
        if (a.resourceRarity === b.resourceRarity) {
          return 0;
        }
        return (
          (a.resourceRarity.toLowerCase() > b.resourceRarity.toLowerCase()
            ? 1
            : -1) * (direction ? 1 : -1)
        );
      },
      count: (a, b) => (a.count - b.count) * (direction ? 1 : -1),
    };

    thisPlugin.itemCount.sort(sortFunctions[orderBy]);
    return thisPlugin.itemCount
      .map((el) => {
        return `<tr>
<td>${el.type}</td>
<td>${el.resourceRarity || ''}</td>
<td>${el.count}</td>
</tr>`;
      })
      .join('');
  }

  function updateItemTableBody(orderBy, direction) {
    $('#live-inventory-item-table tbody')
      .empty()
      .append($(getItemTableBody(orderBy, direction)));
  }

  function exportItems() {
    const str = [
      'Type\tRarity\tCount',
      ...thisPlugin.itemCount.map((i) =>
        [i.type, i.resourceRarity, i.count].join('\t')
      )
    ].join('\n');
    navigator.clipboard.writeText(str);
  }

  function exportKeys() {
    const capsuleNames = parseCapsuleNames(settings.capsuleNames);
    const str = [
      'Name\tLink\tGUID\tKeys\tCapsules',
      ...thisPlugin.keyCount.map((el) =>
        [
          el.portalCoupler.portalTitle,
          `https//intel.ingress.com/?pll=${el._latlng.lat},${el._latlng.lng}`,
          el.portalCoupler.portalGuid,
          el.count,
          el.capsules.map((e) => capsuleNames[e] || e).join(',')
        ].join('\t')
      )
    ].join('\n');
    navigator.clipboard.writeText(str);
  }

  function updateSettingsAndSave() {
    settings.displayMode = $('#live-inventory-settings--mode').val();
    settings.capsuleNames = $('#live-inventory-settings--capsule-names').val();
    settings.serverAddress = $('#teams-server-address').val();
    settings.serverToken = $('#teams-server-token').val();
    settings.serverAutoUpdate = $('#teams-server-auto-update').val();
    settings.serverPerPage = $('#teams-server-per-page').val();
    saveSettings();
    removeAllIcons();
    checkShowAllIcons();
  }

  /**
   * Upload key to the server
   * @param {boolean} saveSettings save settings before upload
   * @param {Function} callback
   */
  function uploadKeys(saveSettings, callback) {
    if (saveSettings) {
      updateSettingsAndSave();
    }
    if (thisPlugin.keyCount.length === 0 || !settings.serverAddress || !settings.serverToken) {
      return;
    }
    return $.ajax({
      url: `${settings.serverAddress}/keys`,
      type: 'POST',
      data: JSON.stringify({
        playerName: window.PLAYER.nickname,
        playerId: thisPlugin.keyCount[0].inInventory.playerId.split('.')[0],
        keys: thisPlugin.keyCount.map((key) => ({
          address: key.portalCoupler.portalAddress,
          count: key.count,
          id: key.portalCoupler.portalGuid.split('.')[0],
          image: key.portalCoupler.portalImageUrl,
          title: key.portalCoupler.portalTitle,
          lat: key._latlng.lat,
          lng: key._latlng.lng,
        })),
      }),
      headers: {
        Authorization: `${settings.serverToken}`,
      },
      context: {},
      dataType: 'json',
      success: (result) => {
        if (callback) {
          callback(result);
        }
      },
      error: serverError,
      contentType: 'application/json; charset=utf-8',
      beforeSend: function (req) {
        req.setRequestHeader('accept', '*/*');
        req.setRequestHeader('X-CSRFToken', readCookie('csrftoken'));
      },
    });
  }

  function displayInventory() {
    dialog({
      html: `
<div id="live-inventory">
  <div id="live-inventory-tables">
    <table id="live-inventory-item-table">
      <thead>
        <tr>
          <th class="" data-orderby="type">Type</th>
          <th class="" data-orderby="rarity">Rarity</th>
          <th class="" data-orderby="count">Count</th>
        </tr>
      </thead>
      <tbody>
        ${getItemTableBody('type', 1)}
      </tbody>
    </table>
    <hr/>
    <table id="live-inventory-key-table">
      <thead>
        <tr>
          <th class="" data-orderby="name">Portal</th>
          <th class="" data-orderby="count">Count</th>
          <th class="" data-orderby="distance">Distance</th>
          <th class="" data-orderby="capsule">Capsules</th>
        </tr>
      </thead>
      <tbody>
        ${getKeyTableBody('name', 1)}
      </tbody>
    </table>
  </div>  
  <hr/>  
  <div id="live-inventory-settings">
    <h2>Settings</h2>
    <table>
      <tr>
        <label>
          <td>Display mode</td>
          <td>
            <select id="live-inventory-settings--mode">
              <option value="icon" ${settings.displayMode === 'icon' ? 'selected' : ''}>Key icon</option>
              <option value="count" ${settings.displayMode === 'count' ? 'selected' : ''}>Number of keys</option>
            </select>
          </td>
        </label>
      </tr>
      <tr>
        <label>
          <td>Server address</td>
          <td><input type="text" id="teams-server-address" value="${settings.serverAddress || ''}" /></td>
        </label>
      </tr>
      <tr>
        <label>
          <td>Server token</td>
          <td><input type="text" id="teams-server-token" value="${settings.serverToken || ''}" /></td>
        </label>
      </tr>
      <tr>
        <label>
          <td>Server autoupdate</td>
          <td>
            <select id="teams-server-auto-update">
              <option value="666" ${settings.serverAutoUpdate === '666' ? 'selected' : ''}>Never</option>
              <option value="0" ${settings.serverAutoUpdate === '0' ? 'selected' : ''}>Every IITC load</option>
              <option value="1" ${settings.serverAutoUpdate === '1' ? 'selected' : ''}>One day</option>
              <option value="2" ${settings.serverAutoUpdate === '2' ? 'selected' : ''}>Two days</option>
              <option value="7" ${settings.serverAutoUpdate === '7' ? 'selected' : ''}>Week</option>
            </select>
          </td>
        </label>
      </tr>
      <tr>
        <label>
          <td>Key items per page</td>
          <td>
            <select id="teams-server-per-page">
              <option value="" ${settings.serverPerPage === '' ? 'selected' : ''}>All</option>
              <option value="50" ${settings.serverPerPage === '50' ? 'selected' : ''}>50</option>
              <option value="100" ${settings.serverPerPage === '100' ? 'selected' : ''}>100</option>
              <option value="200" ${settings.serverPerPage === '200' ? 'selected' : ''}>200</option>
              <option value="500" ${settings.serverPerPage === '500' ? 'selected' : ''}>500</option>
            </select>
          </td>
        </label>
      </tr>
    </table>
    <h3>Capsule names</h3>
    <textarea id="live-inventory-settings--capsule-names" placeholder="CAPSULEID:Display name">${settings.capsuleNames || ''}</textarea>
  </div>
</div>`,
      title: 'Live Inventory',
      id: 'live-inventory',
      width: 'auto',
      closeCallback: updateSettingsAndSave,
    }).dialog('option', 'buttons', {
      'Copy Items': exportItems,
      'Copy Keys': exportKeys,
      'Upload Keys': uploadKeys.bind(this, true, (result) => {
        if (result.ok) {
          alert('Successfully uploaded');
        }
      }),
      OK: function () {
        $(this).dialog('close');
      },
    });

    $('#live-inventory-key-table th').click(function () {
      const orderBy = this.getAttribute('data-orderby');
      this.orderDirection = !this.orderDirection;
      updateKeyTableBody(orderBy, this.orderDirection);
    });

    $('#live-inventory-item-table th').click(function () {
      const orderBy = this.getAttribute('data-orderby');
      this.orderDirection = !this.orderDirection;
      updateItemTableBody(orderBy, this.orderDirection);
    });
  }

  /**
   * Get team keys
   * @param {Object} data
   * @param {string} [data.name]
   * @param {string} [data.page]
   * @param {string} [data.limit]
   * @returns {Promise<{result: {}, count: number}>}
   * @throws {{status: number}}
   */
  function getTeamKeys(data= {}) {
    if (!settings.serverAddress || !settings.serverToken) {
      return Promise.reject(new Error('No setting for the server'));
    }
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `${settings.serverAddress}/keys`,
        headers: {
          Authorization: settings.serverToken,
        },
        data,
        success: (response) => {
          // thisPlugin.teamKeysArray = result;
          thisPlugin.teamKeysMap = {};
          response.result.forEach(
            (item) =>
              (thisPlugin.teamKeysMap[item.id.replace(/-/g, '') + '.16'] = {
                count: item.keys.reduce((acc, key) => acc + key.count, 0),
              })
          );
          resolve(response);
        },
        error: reject,
      });
    });
  }

  function serverError(response) {
    switch (response.status) {
      case 403: alert('Invalid token');
        break;
      case 0: alert('Invalid server address');
        break;
    }
    console.error(response);
  }

  function displayTeam() {
    dialog({
      html: `
        <div id="live-team">
          <table id="live-inventory-key-table">
            <thead>
              <tr>
              <td colspan="3" id="live-team-pages"></td>
              </tr>
              <tr>
                <th data-orderby="name">
                  <input id="teams-name-filter" type="text" placeholder="Portal name" />
                </th>
                <th data-orderby="player">Player</th>
                <th data-orderby="count">Count</th>
              </tr>
            </thead>
            <tbody id="live-inventory-key-table-tbody"></tbody>
          </table>
        </div>`,
      title: 'Team',
      id: 'live-team',
      width: 'auto',
      maxWidth: '800px',
      position: { my: 'left top', at: 'left top', of: window },
      closeCallback: function () {},
    }).dialog('option', 'buttons', {
      OK: function () {
        $(this).dialog('close');
      },
    });
    // click on the pagination section
    $('#live-team-pages').click(filterChange);
    $('#teams-name-filter').on('keyup', debounce(filterChange, 1331));
    displayTeamRequest();
  }

  /**
   * Request to the server to get new team data
   * @param {Object} options
   * @param {number|string} [options.page = 1] Page
   * @param {string} [options.name] Portal title
   */
  function displayTeamRequest(options = {}) {
    options = {
      limit: settings.serverPerPage,
      page: '1',
      ...options,
    };
    console.log(options);
    getTeamKeys(options).then(({ result, count }) => {
      // pagination
      $('#live-team-pages').html(`Total: ${count}
        ${
          options.limit
            ? Array.from(new Array(Math.floor(count / settings.serverPerPage))).map((_, i) => {
              const page = i + 1;
              return `<a href="#" data-page="${page}">${(page).toString() === options.page ? `<span>${page}</span>` : (page)}</a>`;
            }).join('')
            : ''
        }`);
      // keys table
      $('#live-inventory-key-table-tbody').html(`
        ${result.map((item) => {
        return item.keys.map((key, i) => {
          return `<tr>
              ${
                  i === 0
                    ? `<td rowspan="${item.keys.length}" class="help">
                <a href="/?pll=${item.lat},${item.lng}" onclick="window.selectPortalByLatLng(${item.lat},${item.lng});return false">${item.title}</a>
             </td>`
                    : ''
                }
              <td class="help"><abbr title="${dateFormatter.format(new Date(key.date))}">${key.name}</abbr></td>
              <td>${key.count}</td>
            </tr>`;
        }).join('');
      }).join('')}
      `);
    });
  }

  function filterChange(e) {
    const page = e && e.target && e.target.dataset && e.target.dataset.page ? e.target.dataset.page : '1';
    displayTeamRequest({ page, name: $('#teams-name-filter').val() });
  }

  function preparePortalKeyMap() {
    const keyMap = {};
    thisPlugin.keyCount.forEach((k) => {
      keyMap[k.portalCoupler.portalGuid] = k;
    });
    return keyMap;
  }

  function formatDistance(dist) {
    if (dist >= 10000) {
      dist = Math.round(dist / 1000) + 'km';
    } else if (dist >= 1000) {
      dist = Math.round(dist / 100) / 10 + 'km';
    } else {
      dist = Math.round(dist) + 'm';
    }

    return dist;
  }

  function updateDistances() {
    if (!thisPlugin.keyCount) {
      return;
    }
    const center = window.map.getCenter();
    thisPlugin.keyCount.forEach((k) => {
      if (!k._latlng) {
        k._latlng = L.latLng.apply(
          L,
          k.portalCoupler.portalLocation.split(',').map((e) => {
            return HexToSignedFloat(e);
          })
        );
      }
      k._distance = k._latlng.distanceTo(center);
      k._formattedDistance = formatDistance(k._distance);
    });
  }

  /**
   * @typedef InventoryItem
   * @property {Object} resource
   * @property {string} resource.rarity
   * @property {string} resource.resourceType
   * @property {Object} [timedPowerupResource]
   * @property {Object} [portalCoupler]
   * @property {string} portalCoupler.portalAddress
   * @property {string} portalCoupler.portalGuid
   * @property {string} portalCoupler.portalImageUrl
   * @property {string} portalCoupler.portalLocation
   * @property {string} portalCoupler.portalTitle
   * @property {Object} [inInventory]
   * @property {Object} inInventory.acquisitionTimestampMs
   * @property {Object} inInventory.playerId
   */

  /**
   * Prepare data from the getInventory request
   * @param {{result: [{0: string, 1: number, 2: InventoryItem}]}} data
   * @param {boolean} sendNewDataToServer
   */
  function prepareData(data, sendNewDataToServer) {
    thisPlugin.itemCount = prepareItemCounts(data);
    thisPlugin.keyCount = prepareKeyCounts(data);
    thisPlugin.keyMap = preparePortalKeyMap();
    updateDistances();
    if (sendNewDataToServer) {
      uploadKeys(false, () => {
        alert('Keys data updated in team');
      });
    }
  }

  function loadInventory() {
    let localData;
    try {
      localData = JSON.parse(localStorage[KEY_SETTINGS]);
      if (localData && localData.settings) {
        settings = { ...settings, ...localData.settings };
      }
    } catch (e) {}
    const sendNewDataToServer = !localData || !localData.expiresServer || localData.expiresServer < Date.now();
    console.log('settings', localData); // TODO remove all console.log
    getTeamKeys();
    if (localData && localData.expires > Date.now() && localData.data) {
      prepareData(localData.data, sendNewDataToServer);
      return;
    }
    checkSubscription((err, data) => {
      if (data && data.result === true) {
        window.postAjax(
          'getInventory',
          {
            lastQueryTimestamp: 0,
          },
          (data, textStatus, jqXHR ) => {
            localStorage[KEY_SETTINGS] = JSON.stringify({
              data: data,
              expires: Date.now() + 10 * 60 * 1000, // request data only once per ten minutes, or we might hit a rate limit
              expiresServer: Date.now() + 1000 * 60 * 60 * 24 * parseInt(settings.serverAutoUpdate),
              settings: settings,
            });
            prepareData(data, sendNewDataToServer);
          },
          (data, textStatus, jqXHR) => {
            console.error(data);
          }
        );
      }
    });
  }

  function saveSettings() {
    const ls = {};
    try {
      const localData = JSON.parse(localStorage[KEY_SETTINGS]);
      ls.data = localData.data;
      ls.expires = localData.expires;
      ls.expiresServer = localData.expiresServer;
    } catch (e) {}
    ls.settings = settings;
    localStorage[KEY_SETTINGS] = JSON.stringify(ls);
  }

  function portalDetailsUpdated(p) {
    if (!thisPlugin.keyMap) {
      return;
    }
    const capsuleNames = parseCapsuleNames(settings.capsuleNames);
    const countData = thisPlugin.keyMap[p.guid];
    if (countData) {
      $(
        `<tr class="randdetails-keys"><td>${
          countData.count
        }</td><th>Keys</th><th>Capsules</th><td class="randdetails-capsules">${countData.capsules
          .map((e) => capsuleNames[e] || e)
          .join(', ')}</td></tr>`
      ).appendTo($('#randdetails tbody'));
    }
    $.ajax({
      url: `${settings.serverAddress}/portals/${p.guid.split('.')[0]}`,
      headers: {
        Authorization: settings.serverToken,
      },
      success: (result) => {
        if (result && $('#teams-portal-keys').length === 0) {
          $(
            `${result
              .map((item, i) => {
                return `<tr>
              ${i === 0 ? '<th id="teams-portal-keys">Team</th>' : '<td></td>'}
              <td colspan="2" class="help"><abbr title="${item.date}">${
  item.name
}</abbr></td>
              <td>${item.count}</td>
            </tr>`;
              })
              .join('')}`
          ).appendTo($('#randdetails tbody'));
        }
      },
      error: serverError,
    });
  }

  function addKeyToLayer(data) {
    const tileParams = window.getCurrentZoomTileParameters
      ? window.getCurrentZoomTileParameters()
      : window.getMapZoomTileParameters();
    if (tileParams.level !== 0) {
      return;
    }

    if (
      !data.portal._keyMarker &&
      ((thisPlugin.keyMap && thisPlugin.keyMap[data.portal.options.guid]) ||
        (thisPlugin.teamKeysMap &&
          thisPlugin.teamKeysMap[data.portal.options.guid]))
    ) {
      let icon = thisPlugin.keyIcon;
      if (settings.displayMode === 'count') {
        icon = new L.DivIcon({
          html: thisPlugin.keyMap[data.portal.options.guid].count,
          className: 'plugin-live-inventory-count',
        });
      }
      data.portal._keyMarker = L.marker(data.portal._latlng, {
        icon: icon,
        interactive: false,
        keyboard: false,
      });
    }
    if (thisPlugin.keyMap && thisPlugin.keyMap[data.portal.options.guid]) {
      data.portal._keyMarker.addTo(thisPlugin.layerGroup);
    }
    if (
      thisPlugin.teamKeysMap &&
      thisPlugin.teamKeysMap[data.portal.options.guid]
    ) {
      data.portal._keyMarker.addTo(thisPlugin.teamLayerGroup);
    }
  }

  function removeKeyFromLayer(data) {
    if (data.portal._keyMarker) {
      thisPlugin.layerGroup.removeLayer(data.portal._keyMarker);
      thisPlugin.teamLayerGroup.removeLayer(data.portal._keyMarker);
      delete data.portal._keyMarker;
    }
  }

  function removeAllIcons() {
    thisPlugin.layerGroup.clearLayers();
    thisPlugin.teamLayerGroup.clearLayers();
    for (let id in window.portals) {
      delete window.portals[id]._keyMarker;
    }
  }

  function checkShowAllIcons() {
    const tileParams = window.getCurrentZoomTileParameters
      ? window.getCurrentZoomTileParameters()
      : window.getMapZoomTileParameters();
    if (tileParams.level !== 0) {
      removeAllIcons();
    } else {
      for (let id in window.portals) {
        addKeyToLayer({
          portal: window.portals[id],
        });
      }
    }
  }

  function setup() {
    const $toolbox = $('#toolbox');

    loadInventory();

    $('<a href="#">')
      .text('Inventory')
      .click(displayInventory)
      .appendTo($toolbox);

    $('<a href="#">').text('Team').click(displayTeam.bind(null, {})).appendTo($toolbox);

    $('<style>')
      .prop('type', 'text/css')
      .html(CSS_STYLES)
      .appendTo('head');

    window.addHook('portalDetailsUpdated', portalDetailsUpdated);
    window.addHook('portalAdded', addKeyToLayer);
    window.addHook('portalRemoved', removeKeyFromLayer);
    window.map.on('zoom', checkShowAllIcons);
    window.map.on('moveend', updateDistances);
  }

  function delaySetup() {
    thisPlugin.layerGroup = new L.LayerGroup();
    window.addLayerGroup('Portal keys', thisPlugin.layerGroup, false);

    thisPlugin.teamLayerGroup = new L.LayerGroup();
    window.addLayerGroup('Team keys', thisPlugin.teamLayerGroup, false);

    createIcons();

    setTimeout(setup, 1000); // delay setup and thus requesting data, or we might encounter a server error
  }
  delaySetup.info = plugin_info; //add the script info data to the function as a property

  if (window.iitcLoaded) {
    delaySetup();
  } else {
    if (!window.bootPlugins) {
      window.bootPlugins = [];
    }
    window.bootPlugins.push(delaySetup);
  }
}

(function () {
  const plugin_info = {};
  if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    plugin_info.script = {
      version: GM_info.script.version,
      name: GM_info.script.name,
      description: GM_info.script.description,
    };
  }
  // Greasemonkey. It will be quite hard to debug
  if (
    typeof unsafeWindow != 'undefined' ||
    typeof GM_info == 'undefined' ||
    GM_info.scriptHandler !== 'Tampermonkey'
  ) {
    // inject code into site context
    const script = document.createElement('script');
    script.appendChild(
      document.createTextNode(
        '(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'
      )
    );
    (document.body || document.head || document.documentElement).appendChild(
      script
    );
  } else {
    // Tampermonkey, run code directly
    wrapper(plugin_info);
  }
})();
