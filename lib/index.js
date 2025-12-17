'use strict';

const HmpoCachedModel = require('hmpo-cached-model');
const MutedCachedModel = require('./muted-cached-model');
const debug = require('debug')('hmpo:countries-cached-model');
const _ = require('underscore');

class CountriesCachedModel {

    /**
     * Constructs a new instance of the CountriesCachedModel.
     *
     * Initializes various country-related lists and mappings, sets up a cached model
     * for country data, and binds event listeners for handling changes and errors.
     *
     * @param {Object} [options={}] - Configuration options for the model.
     * @param {string} [options.key='countrieslib'] - A unique key used for storage identification.
     * @param {string} options.countryUrl - The URL endpoint to fetch country data from.
     * @param {Object} options.store - The storage mechanism used for caching (e.g., localStorage).
     * @param {number} options.countryInterval - Polling interval for API data refresh in milliseconds.
     * @param {number} options.storeInterval - Polling interval for store data refresh in milliseconds.
     * @param {boolean} [options.verbose=false] - Determines whether to use a verbose model (HmpoCachedModel) or a muted one (MutedCachedModel).
     */
    constructor(options) {
        options = options || {};
        options.key = options.key || 'countrieslib';

        this._overseasCountries = [];
        this._residenceCountries = [];
        this._overseasResidenceCountries = [];
        this._birthCountries = [];
        this._overseasBirthCountries = [];
        this._countriesById = {};
        this._countriesBySlug = {};
        this._countriesByDisplayName = {};

        let Model = options.verbose ? HmpoCachedModel : MutedCachedModel;

        this._countryCache = new Model(null, {
            url: options.countryUrl,
            store: options.store,
            key: options.key + '-countries',
            apiInterval: options.countryInterval,
            storeInterval: options.storeInterval
        });

        this.on('change', this._indexCountries.bind(this));
        this.on('fail', this.onFail.bind(this));
        this.on('error', this.onError.bind(this));
    }

    /**
     * Subscribes a handler function to a specific event on the internal country cache.
     *
     * @param {string} event - The name of the event to listen for (e.g., 'change', 'fail', 'error').
     * @param {Function} handler - The callback function to execute when the event is triggered.
     *
     * @example
     * countriesLib.on('change', doSomething());
     */
    on(event, handler) {
        this._countryCache.on(event, handler);
    }

    /**
     * Start polling the provided API URL for country data.
     */
    start() {
        debug('start');
        this._countryCache.start();
    }

    /**
     * Stop polling the provided API URL for country data.
     */
    stop() {
        debug('stop');
        this._countryCache.stop();
    }

    /**
     * Retrieve the list of all Countries.
     * @returns {Array<Object>} - The list of all Countries.
     *
     * @example
     * let allCountries = countriesLib.getAllCountries();
     */
    getAllCountries() {
        return this._countryCache.get('data');
    }

    /**
     * Retrieve the list of all Overseas Countries.
     * @returns {Array<Object>} - The list of Overseas Countries.
     *
     * @example
     * let ovsCountries = countriesLib.getOverseasCountries();
     */
    getOverseasCountries() {
        return this._overseasCountries;
    }

    /**
     * Retrieve the list of all Birth Countries.
     * @returns {Array<Object>} - The list of Birth Countries.
     *
     * @example
     * let birthCountries = countriesLib.getBirthCountries();
     */
    getBirthCountries() {
        return this._birthCountries;
    }

    /**
     * Retrieve the list of all Residence Countries.
     * @returns {Array<Object>} - The list of Residence Countries.
     *
     * @example
     * let residenceCountries = countriesLib.getResidenceCountries();
     */
    getResidenceCountries() {
        return this._residenceCountries;
    }


    /**
     * Retrieve the list of all Residence Countries that can be used for contact phone numbers.
     *
     * The addressCountryFlag as part of _residenceCountries is used to denote both countries of application,
     * as well as countries of address/contact. Therefore some countries will need to be excluded.
     *
     * @returns {Array<Object>} - The list of Residence Countries.
     *
     * @example
     * let contactDetailsResidenceCountries = countriesLib.getResidenceCountriesForContact();
     */
    getResidenceCountriesForContact() {
        return this._residenceCountries.filter(
            country => {
                // These Palestine varients are only used as countries of application.
                // PS, Palestine is used for address/contact details instead.
                const excluded_countries = [
                    'PJ', // Palestine (West Bank)
                    'PZ', // Palestine (Gaza)
                ];
                return !excluded_countries.includes(country.countryCode);
            }
        );
    }

    /**
     * Retrieve the list of all Overseas Residence Countries.
     * @returns {Array<Object>} - The list of Overseas Residence Countries.
     *
     * @example
     * let ovsResidenceCountries = countriesLib.getOverseasResidenceCountries();
     */
    getOverseasResidenceCountries() {
        return this._overseasResidenceCountries;
    }

    /**
     *
     * @returns {Array<Object>} - The list of Overseas Birth Countries
     *
     * @example
     * let ovsBirthCountries = countriesLib.getOverseasBirthCountries();
     */
    getOverseasBirthCountries() {
        return this._overseasBirthCountries;
    }

    /**
     * Retrieves country data based on a given country code.
     *
     * If the input code is `'UK'`, it is normalized to `'GB'` before lookup.
     *
     * @param {string} countryCode - The country code (e.g., 'US', 'UK', 'FR').
     * @returns {?Object} The country object if found, otherwise, `null`.
     *
     * @example
     * let unitedKingdom = countriesLib.getCountryById('UK'); // return country object for United Kingdom
     */
    getCountryById(countryCode) {
        if (countryCode === 'UK') countryCode = 'GB';
        return countryCode ? this._countriesById[countryCode] : null;
    }

    /**
     * Retrieves a country object based on the provided slug (URL-friendly name).
     *
     * @param {string} countryNameSlug - The slugified name of the country (e.g., "united-states").
     * @returns {?Object} The country object if found, otherwise, `null`.
     *
     * @example
     * let spain = countriesLib.getCountryBySlug('spain'); // return country object for Spain
     */
    getCountryBySlug(countryNameSlug) {
        return countryNameSlug ? this._countriesBySlug[countryNameSlug] : null;
    }

    /**
     * Retrieves a country object based on the provided display name.
     *
     * @param {string} countryDisplayName - The display name of the country.
     * @returns {?Object} The country object if found, otherwise, `null`.
     *
     * @example
     * let franceData = countriesLib.getCountryByDisplayName('France'); // return country object for France.
     */
    getCountryByDisplayName(countryDisplayName) {
        return countryDisplayName ? this._countriesByDisplayName[countryDisplayName] : null;
    }

    /**
     * Retrieves country data based on a given country code.
     *
     * Calls `getCountryById(countryCode)` directly.
     *
     * If the input code is `'UK'`, it is normalized to `'GB'` before lookup.
     *
     * @param {string} countryCode - The country code (e.g., 'US', 'UK', 'FR').
     * @returns {?Object} The country object if found, otherwise, `null`.
     *
     * @example
     * let ukCountryData = countriesLib.getCountryDataById('GB'); // return country object for Great Britain
     */
    getCountryDataById(countryCode) {
        return this.getCountryById(countryCode);
    }

    /**
     * Retrieves a country object based on the provided slug (URL-friendly name).
     *
     * Calls getCountryBySlug(countryNameSlug) directly.
     *
     * @param {string} countryNameSlug - The slugified name of the country (e.g., "united-states").
     * @returns {?Object} The country object if found, otherwise, `null`.
     *
     * @example
     * let countryDataForUS = countriesLib.getCountryDataBySlug('united-states'); // return country object for the United States
     */
    getCountryDataBySlug(countryNameSlug) {
        return this.getCountryBySlug(countryNameSlug);
    }

    /**
     * Checks if a country is restricted using its country code.
     *
     * @param {string} id - The country code (e.g., 'US', 'UK', 'FR').
     * @returns {boolean} `true` if the country is restricted, otherwise, `false`.
     *
     * @example
     * let isUKRestricted = countriesLib.isRestrictedById('UK'); // return `false`
     */
    isRestrictedById(id) {
        let data = this.getCountryDataById(id);
        return data && data.contentType === 7;
    }

    /**
     * Checks if the stopNewApplications flag by country code is enabled.
     *
     * @param {string} id - The country code (e.g., 'US', 'UK', 'FR').
     * @returns {boolean} `true` if the new applications are stopped for that country is restricted, otherwise, `false`.
     *
     * @example
     * let areNewApplicationsStopped = countriesLib.areNewApplicationsStoppedForId('FR'); // return `false`
     */
    areNewApplicationsStoppedForId(id) {
        let data = this.getCountryDataById(id);
        return data?.applicationProcessing?.stopNewApplications;
    }

    /**
     * Checks if a country is active using its country code.
     *
     * @param {string} id - The country code (e.g., 'US', 'UK', 'FR').
     * @returns {boolean} `true` if the country status is 'ACTIVE', otherwise, `false`.
     *
     * @example
     * let isFranceActive = countriesLib.isActiveById('FR'); // return `true`
     */
    isActiveById(id) {
        let data = this.getCountryDataById(id);
        return data && data.status === 'ACTIVE';
    }

    /**
     * Retrieve the country name slug using the provided country code.
     *
     * @param {string} countryCode - The country code (e.g., 'US', 'UK', 'FR').
     * @returns {string|undefined} The slug version of the country's name if found, otherwise `undefined`.
     *
     * @example
     * let countryNameSlug = countriesLib.getSlugById('UK'); // return 'united-kingdom'
     */
    getSlugById(countryCode) {
        let data = this.getCountryById(countryCode);
        return data && data.countryNameSlug;
    }

    // Returns true if the country should be included in overseas residence countries
    _isAllowedOverseasResidenceCountry(country) {
        // Not all overseas countries should be residences/countries of application.
        // This is because addressCountryFlag is used both to denote whether it is a country that can be applied from,
        // or a country that is used as part of address/contact lookups.
        // UK, Channnel Islands should be excluded as these are not part of the international journey.
        // Palestine should be excluded as the Gaza/West Bank varients should be used for selecting country of application,
        // yet it should still feature as part of the contact details (phone number) lookup.
        const excluded_countries = [
            'FO', // Faroe Islands
            'GB', // United Kingdom
            'GG', // Guernsey
            'IM', // Isle of Man
            'JE', // Jersey
            'PS'  // Palestine
        ];
        return country.addressCountryFlag === true
        && !excluded_countries.includes(country.countryCode);
    }

    _indexCountries() {
        debug('indexing countries');
        let countries = this._countryCache.get('data');
        this._overseasCountries = _.filter(
            countries,
            country => country.countryCode !== 'GB'
        );
        this._residenceCountries = _.filter(
            countries,
            country => country.addressCountryFlag === true
        );
        this._overseasResidenceCountries = _.filter(
            countries,
            this._isAllowedOverseasResidenceCountry
        );
        this._birthCountries = _.filter(
            countries,
            country => country.countryOfBirthFlag === true
        );
        this._overseasBirthCountries = _.filter(
            countries,
            country => country.countryOfBirthFlag === true && country.countryCode !== 'GB'
        );
        this._countriesById = _.indexBy(countries, 'countryCode');
        this._countriesBySlug = _.indexBy(countries, 'countryNameSlug');
        this._countriesByDisplayName = _.indexBy(countries, 'displayName');
    }

    /**
     * Sorts a list of country objects by their `displayName` property.
     * Conditional to move the country with `countryCode` 'GB' (United Kingdom) to the top of the list if present.
     * The GB move to top is optional as there are some instances where this is not required.
     *
     * @param {Array<Object>} list - The array of country objects to sort.
     * @param {boolean} list - Whether the GB country entry should move to top.
     *
     * Each object should have at least `displayName` and `countryCode` properties.
     * @returns {Array<Object>} - The sorted list with 'GB' (if found) at the beginning.
     *
     * @example
     * const countries = [
     *   { displayName: 'Canada', countryCode: 'CA' },
     *   { displayName: 'United Kingdom', countryCode: 'GB' },
     *   { displayName: 'Australia', countryCode: 'AU' }
     * ];
     *
     * const sorted = sortCountryList(countries);
     * // Result:
     * // [
     * //   { displayName: 'United Kingdom', countryCode: 'GB' },
     * //   { displayName: 'Australia', countryCode: 'AU' },
     * //   { displayName: 'Canada', countryCode: 'CA' }
     * // ]
     */
    sortCountryList(list, moveGbToTop = true) {
        list = _.sortBy(list, 'displayName');
        if (moveGbToTop) {
            let gb = _.find(list, { countryCode: 'GB' });
            if (gb) {
                list = _.reject(list, { countryCode: 'GB' });
                list.unshift(gb);
            }
        }
        return list;
    }

    /**
     * Transforms a sorted list of countries into a dropdown-friendly format.
     * Optionally uses Welsh display names based on the `isWelsh` flag.
     *
     * @param {Array<Object>} list - The array of country objects to transform.
     * Each object should have `countryCode`, `displayName`, and `displayNameWelsh` properties.
     * @param {boolean} isWelsh - Whether to use the Welsh display name (`displayNameWelsh`) instead of the default (`displayName`).
     * @returns {Array<Object>} - An array of objects formatted for use in dropdowns,
     * each containing `value`, `text`, and `label` properties.
     *
     * @example
     * const countries = [
     *   { countryCode: 'GB', displayName: 'United Kingdom', displayNameWelsh: 'Deyrnas Unedig' },
     *   { countryCode: 'FR', displayName: 'France', displayNameWelsh: 'Ffrainc' }
     * ];
     *
     * const dropdown = dropdownList(countries, false);
     * // Result:
     * // [
     * //   { value: 'GB', text: 'United Kingdom', label: 'United Kingdom' },
     * //   { value: 'FR', text: 'France', label: 'France' }
     * // ]
     */
    dropdownList(list, isWelsh, moveGbToTop = true) {
        list = this.sortCountryList(list, moveGbToTop);
        return list.map(i => ({
            value: i.countryCode,
            text: isWelsh ? i.displayNameWelsh : i.displayName,
            label: isWelsh ? i.displayNameWelsh : i.displayName
        }));
    }

    /**
     * Returns a dropdown-friendly formatted list of Birth Countries.
     * Optionally uses Welsh display names based on the `isWelsh` flag.
     *
     * A wrapper function around `dropdownList(list, isWelsh)`.
     *
     * @param {boolean} isWelsh - Whether to use the Welsh display name (`displayNameWelsh`) instead of the default (`displayName`).
     * @returns {Array<Object>} - An array of objects formatted for use in dropdowns,
     * each containing `value`, `text`, and `label` properties.
     */
    dropdownListBirthCountries(isWelsh, moveGbToTop = true) {
        return this.dropdownList(this.getBirthCountries(moveGbToTop), isWelsh, moveGbToTop);
    }

    /**
     * Returns a dropdown-friendly formatted list of Overseas Birth Countries.
     * Optionally uses Welsh display names based on the `isWelsh` flag.
     *
     * A wrapper function around `dropdownList(list, isWelsh)`.
     *
     * @param {boolean} isWelsh - Whether to use the Welsh display name (`displayNameWelsh`) instead of the default (`displayName`).
     * @returns {Array<Object>} - An array of objects formatted for use in dropdowns,
     * each containing `value`, `text`, and `label` properties.
     */
    dropdownListOverseasBirthCountries(isWelsh) {
        return this.dropdownList(this.getOverseasBirthCountries(), isWelsh);
    }

    /**
     * Returns a dropdown-friendly formatted list of Residence Countries.
     * Optionally uses Welsh display names based on the `isWelsh` flag.
     *
     * A wrapper function around `dropdownList(list, isWelsh)`.
     *
     * @param {boolean} isWelsh - Whether to use the Welsh display name (`displayNameWelsh`) instead of the default (`displayName`).
     * @returns {Array<Object>} - An array of objects formatted for use in dropdowns,
     * each containing `value`, `text`, and `label` properties.
     */
    dropdownListResidenceCountries(isWelsh) {
        return this.dropdownList(this.getResidenceCountries(), isWelsh);
    }

    /**
     * Returns a dropdown-friendly formatted list of Overseas Residence Countries.
     * Optionally uses Welsh display names based on the `isWelsh` flag.
     *
     * A wrapper function around `dropdownList(list, isWelsh)`.
     *
     * @param {boolean} isWelsh - Whether to use the Welsh display name (`displayNameWelsh`) instead of the default (`displayName`).
     * @returns {Array<Object>} - An array of objects formatted for use in dropdowns,
     * each containing `value`, `text`, and `label` properties.
     */
    dropdownListOverseasResidenceCountries(isWelsh) {
        return this.dropdownList(this.getOverseasResidenceCountries(), isWelsh);
    }

    /**
     * Handles failures from a country-related outbound request, logging relevant details.
     *
     * @param {Object} err - The error object.
     * @param {Object} data - The response data, which may include an `error` message.
     * @param {Object} settings - The request settings.
     * @param {number} statusCode - The HTTP status code returned from the request.
     * @param {number} responseTime - The time taken for the request to complete, in milliseconds.
     *
     * @example
     * const err = new Error('Request timeout');
     * err.body = '<html>Error page</html>';
     *
     * const data = { error: 'Service unavailable' };
     *
     * const settings = {
     *   method: 'GET',
     *   url: 'https://api.example.com/countries'
     * };
     *
     * const statusCode = 503;
     * const responseTime = 1200;
     *
     * onFail(err, data, settings, statusCode, responseTime);
     * // Logs:
     * // Countries CachedModel request failed GET https://api.example.com/countries 503 "Request timeout"
     */
    onFail(err, data, settings, statusCode, responseTime) {
        const errorText = (err && err.message) || (data && data.error) || '';

        this._countryCache.getLogger().outbound('Countries CachedModel request failed :outVerb :outRequest :outResponseCode :outError', {
            outVerb: settings.method,
            outRequest: settings.url,
            outResponseCode: statusCode,
            outResponseTime: responseTime,
            outError: errorText,
            outErrorBody: this._countryCache.getLogger().trimHtml(err.body)
        });
    }

    /**
     * Handles errors that occur during a Countries CachedModel request.
     *
     * Logs the error using the outbound logger provided by the country cache.
     *
     * @param {Error} err - The error object caught during the request.
     *
     * @example
     * try {
     *   // Simulate a failing request
     *   throw new Error('Network unreachable');
     * } catch (err) {
     *   onError(err);
     *   // Logs:
     *   // Countries CachedModel request error Network unreachable
     * }
     */
    onError(err) {
        this._countryCache.getLogger().outbound('Countries CachedModel request error :err.message', err);
    }
}

module.exports = CountriesCachedModel;
