# hmpo-countries-lib

Country data API cache and wrapper library

In-depth API Documentation can be found in [API_DOCS.md](./API_DOCS.md).

> The documentation is auto-generated from the JS Docs in [index.js](./lib/index.js) using [documentation.js](https://www.npmjs.com/package/documentation).

You can re-generate the documentation after making changes by running:

```bash
npm run documentation
```

This will also run as part of the [pre-push hook](./.husky/pre-push).

## Features and benefits of `hmpo-countries-lib`

* **API Wrapping**: Acts as an intermediary for an external country data source.
* **Caching**: Caches country data locally to speed up access and reduce load on the source API. Supports Redis via a store factory.
* **Automatic Polling**: Periodically fetches updates from the source API in the background.
* **Flexible Retrieval**: Offers methods to get:
  * All countries.
  * Filtered lists (e.g., resident, overseas, birth countries).
  * Specific country data by ID, slug, or display name.
* **Lifecycle Management**: Provides `start()` and `stop()` methods to control the polling process.

## Pre-requisites

`hmpo-countries-lib` requires a store, such as a redis client factory, in order to interface with the usage of [`hmpo-cached-model`](https://github.com/HMPO/hmpo-cached-model) in this library. `hmpo-cached-model` requires that its `store` object has a function `getClient()`.

See [hmpo-cached-model](https://github.com/HMPO/hmpo-cached-model) for more information.

## Installation

Add `hmpo-countries-lib` to your project via npm or yarn

```bash
npm install hmpo-countries-lib
```

```bash
yarn add hmpo-countries-lib
```

## Usage

You might create your custom `hmpo-countries-lib` instance under a file such as `lib/custom-country-lib.js`.

This file will:

* Export the configured `hmpo-countries-lib` class.
* Define the behaviour of the methods:
  * `onFail()`
  * `onError()`
  * `on()`

### Begin polling for country data

```javascript
const CountriesLib = require('hmpo-countries-lib');

// redisFactory is our store, exposing getClient() which is required by hmpo-cached-model.
let redisFactory = {
    getClient() {
        return redisInstance;
    }
}

let countriesLib = new CountriesLib({
    store: redisFactory,  // This will be passed to a constructor for hmpo-cached-model, or a muted extension of it.
    key: 'store-key-prefix',
    storeInterval: 10000, // 10 seconds - The interval to write a snapshot of the country data to redis
    countryUrl: 'http://example.com/api/countries',
    countryInterval: 3000000 // 5 minutes - The interval to poll the Country API URL for updated country data
});

// start polling
countriesLib.start();
```

### API Documentation

Full documentation for `hmpo-countries-lib` can be found at [API Docs](./API_DOCS.md).

A few examples as follows:

```javascript

// Get an array of all countries
let allCountries = countriesLib.getAllCountries();

// Get arrays of countries from pre-defined catagories
let overseasCountries = countriesLib.getOverseasCountries();

// Get a specific country using a unique identifer
let countryData = countriesLib.getCountryDataById('GB');

// Get information on a specific country
let isUkRestricted = countriesLib.isRestrictedById('UK'); // false
```

**Sorting & formatting for dropdown lists**

Once you have a list of countries:

```javascript
let allCountries = countriesLib.getAllCountries();
```

You can sort the countries alphabetically. This will put GB at the top if it is included in the list.

```javascript
let sortedCountries = countriesLib.sortCountryList(allCountries);
```

You can transform a list of countries into a dropdown-friendly format.
This will automatically sort the list.

```javascript
// Optionally translate country names to welsh using the `isWelsh` flag.
let countriesDropdownList = countriesLib.dropdownList(allCountries, false);
```

There are also specific dropdownList methods for Birth and Residence Countries.
All of these have an optional `isWelsh` param to translate names to Welsh.

e.g.

```javascript
// Birth Countries
let birthCountriesDropdown = countriesLib.dropdownListBirthCountries();
```

### Custom failure handling

Logs a custom failure message in the format:
 `'Countries CachedModel request failed :outVerb :outRequest :outResponseCode :outError'`

```javascript
// Example Usage

fetch('https://api.example.com/countries')
    .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
            const exampleError = new Error(data.error || 'Request failed');
            exampleError.body = JSON.stringify(data);
            this.onFail(exampleError, data, {
                method: 'GET',
                url: 'https://api.example.com/countries'
            }, response.status, response.headers.get('X-Response-Time') || 0);
        } else {
            // Handle successful response
            console.log('Countries:', data);
        }
    })
    .catch((err) => {
        // Some other error
        this.onFail(err, null, {
            method: 'GET',
            url: 'https://api.example.com/countries'
        }, 0, 0);
    });
```

### Stop polling for country data

```javascript
// stop polling
countriesLib.stop();
```
