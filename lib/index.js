'use strict';

const HmpoCachedModel = require('hmpo-cached-model');
const MutedCachedModel = require('./muted-cached-model');
const debug = require('debug')('hmpo:countries-cached-model');
const _ = require('underscore');

class CountriesCachedModel {
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

    on(event, handler) {
        this._countryCache.on(event, handler);
    }

    start() {
        debug('start');
        this._countryCache.start();
    }

    stop() {
        debug('stop');
        this._countryCache.stop();
    }

    getAllCountries() {
        return this._countryCache.get('data');
    }

    getOverseasCountries() {
        return this._overseasCountries;
    }

    getBirthCountries() {
        return this._birthCountries;
    }

    getResidenceCountries() {
        return this._residenceCountries;
    }

    getOverseasResidenceCountries() {
        return this._overseasResidenceCountries;
    }

    getOverseasBirthCountries() {
        return this._overseasBirthCountries;
    }

    getCountryById(countryCode) {
        if (countryCode === 'UK') countryCode = 'GB';
        return countryCode ? this._countriesById[countryCode] : null;
    }

    getCountryBySlug(countryNameSlug) {
        return countryNameSlug ? this._countriesBySlug[countryNameSlug] : null;
    }

    getCountryByDisplayName(countryDisplayName) {
        return countryDisplayName ? this._countriesByDisplayName[countryDisplayName] : null;
    }

    getCountryDataById(countryCode) {
        return this.getCountryById(countryCode);
    }

    getCountryDataBySlug(countryNameSlug) {
        return this.getCountryBySlug(countryNameSlug);
    }

    isRestrictedById(id) {
        let data = this.getCountryDataById(id);
        return data && data.contentType === 7;
    }

    isActiveById(id) {
        let data = this.getCountryDataById(id);
        return data && data.status === 'ACTIVE';
    }

    getSlugById(countryCode) {
        let data = this.getCountryById(countryCode);
        return data && data.countryNameSlug;
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
            country => country.addressCountryFlag === true && country.countryCode !== 'GB'
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

    sortCountryList(list) {
        list = _.sortBy(list, 'displayName');
        let gb = _.find(list, {countryCode: 'GB'});
        if (gb) {
            list = _.reject(list, {countryCode: 'GB'});
            list.unshift(gb);
        }
        return list;
    }

    dropdownList(list, isWelsh) {
        list = this.sortCountryList(list);
        return list.map(i => ({
            value: i.countryCode,
            text: isWelsh ? i.displayNameWelsh : i.displayName,
            label: isWelsh ? i.displayNameWelsh : i.displayName
        }));
    }

    dropdownListBirthCountries(isWelsh) {
        return this.dropdownList(this.getBirthCountries(), isWelsh);
    }

    dropdownListOverseasBirthCountries(isWelsh) {
        return this.dropdownList(this.getOverseasBirthCountries(), isWelsh);
    }

    dropdownListResidenceCountries(isWelsh) {
        return this.dropdownList(this.getResidenceCountries(), isWelsh);
    }

    dropdownListOverseasResidenceCountries(isWelsh) {
        return this.dropdownList(this.getOverseasResidenceCountries(), isWelsh);
    }

    onFail(err, data, settings, statusCode, responseTime) {
        const errorText = (err && err.message) || (data && data.error) || '';

        this._countryCache.logger.outbound('Countries CachedModel request failed :outVerb :outRequest :outResponseCode :outError', {
            outVerb: settings.method,
            outRequest: settings.url,
            outResponseCode: statusCode,
            outResponseTime: responseTime,
            outError: errorText,
            outErrorBody: this._countryCache.logger.trimHtml(err.body)
        });
    }

    onError(err) {
        this._countryCache.logger.outbound('Countries CachedModel request error :err.message', err);
    }
}

module.exports = CountriesCachedModel;
