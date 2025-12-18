'use strict';

const chai = require('chai');
chai.should();
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const CountriesCachedModel = require('../../lib');

const unitedKingdom = {
    countryCode: 'GB',
    countryNameSlug: 'united-kingdom',
    addressCountryFlag: true,
    countryOfBirthFlag: true,
    displayName: 'United Kingdom',
    displayNameWelsh: 'Welsh United Kingdom',
    channel: 'ONLINE',
    contentType: 1,
    status: 'ACTIVE'
};
const foo = {
    countryCode: 'AA',
    countryNameSlug: 'foo',
    addressCountryFlag: true,
    countryOfBirthFlag: false,
    displayName: 'Foo',
    displayNameWelsh: 'Welsh Foo',
    channel: 'ONLINE',
    contentType: 2,
    status: 'INACTIVE',
    applicationProcessing: {
        stopNewApplications: false
    }
};
const bar = {
    countryCode: 'BA',
    countryNameSlug: 'bar',
    addressCountryFlag: false,
    countryOfBirthFlag: true,
    displayName: 'Bar',
    displayNameWelsh: 'Welsh Bar',
    channel: 'NA',
    contentType: 7,
    status: 'INACTIVE',
    applicationProcessing: {
        stopNewApplications: true
    }
};
const narnia = {
    countryCode: 'NA',
    countryNameSlug: 'narnia',
    addressCountryFlag: null,
    countryOfBirthFlag: null,
    displayName: 'Narnia',
    displayNameWelsh: 'Welsh Narnia',
    channel: 'ONLINE',
    contentType: 7,
    status: 'INACTIVE'
};

const countries = [foo, unitedKingdom, bar, narnia];

describe('CountriesCachedModel', () => {
    let clock, instance, options, stubs;

    beforeEach(() => {
        clock = sinon.useFakeTimers(1234567890000);

        stubs = {
            storeFactory: {
                getClient: sinon.stub()
            },
            store: {
                get: sinon.stub(),
                set: sinon.stub().yields(null)
            },
            HmpoCachedModel: sinon.stub(),
            MutedCachedModel: sinon.stub(),
            countryCache: {
                getLogger: sinon.stub(),
                start: sinon.stub(),
                stop: sinon.stub(),
                on: sinon.stub(),
                get: sinon.stub().returns(countries)
            },
            logger: {
                outbound: sinon.stub(),
                trimHtml: sinon.stub().returnsArg(0)
            },
        };

        stubs.storeFactory.getClient.returns(stubs.store);
        stubs.HmpoCachedModel.returns(stubs.countryCache);
        stubs.MutedCachedModel.returns(stubs.countryCache);
        stubs.countryCache.getLogger.returns(stubs.logger);

        options = {
            countryUrl: 'http://example.com/countries',
            key: 'test',
            store: stubs.storeFactory,
            storeInterval: 1000,
            countryInterval: 2000
        };

        stubs.CountriesCachedModel = proxyquire('../../lib', {
            'hmpo-cached-model': stubs.HmpoCachedModel,
            './muted-cached-model': stubs.MutedCachedModel
        });

        instance = new stubs.CountriesCachedModel(options);
    });

    afterEach(() => {
        clock.restore();
    });

    it('should be a function', () => {
        CountriesCachedModel.should.be.a('function');
    });

    describe('constructor', () => {
        it('should use default key name if no options supplied', () => {
            stubs.MutedCachedModel.resetHistory();
            instance = new stubs.CountriesCachedModel();
            stubs.MutedCachedModel.firstCall.should.have.been.calledWithMatch(null, {
                key: 'countrieslib-countries'
            });
        });

        it('should create a country cache', () => {
            stubs.MutedCachedModel.should.have.been.calledWithMatch(null, {
                url: 'http://example.com/countries',
                store: stubs.storeFactory,
                key: 'test-countries',
                apiInterval: 2000,
                storeInterval: 1000
            });
            instance._countryCache.should.equal(stubs.countryCache);
        });

        it('should use a non muted cached model if verbose option is set', () => {
            stubs.HmpoCachedModel.resetHistory();
            instance = new stubs.CountriesCachedModel({ verbose: true });
            stubs.HmpoCachedModel.should.have.been.called;
        });

        it('should attach loggers to failures, and indexers to cache change events', () => {
            stubs.countryCache.on.should.have.been.calledThrice;
            stubs.countryCache.on.should.have.been.calledWithExactly('change', sinon.match.func);
            stubs.countryCache.on.should.have.been.calledWithExactly('fail', sinon.match.func);
            stubs.countryCache.on.should.have.been.calledWithExactly('error', sinon.match.func);
        });
    });

    describe('on', () => {
        it('should be a function', () => {
            instance.on.should.be.a('function');
        });

        it('should add event listeners to country cache', () => {
            let handler = sinon.stub();
            instance.on('event', handler);
            stubs.countryCache.on.should.have.been.calledWithExactly('event', handler);
        });
    });

    describe('start', () => {
        it('should be a function', () => {
            instance.start.should.be.a('function');
        });

        it('should call start on country cache', () => {
            instance.start();
            stubs.countryCache.start.should.have.been.calledOnce;
        });
    });

    describe('stop', () => {
        it('should be a function', () => {
            instance.stop.should.be.a('function');
        });

        it('should call stop on country cache', () => {
            instance.stop();
            stubs.countryCache.stop.should.have.been.calledOnce;
        });
    });

    describe('getAllCountries', () => {
        it('should be a function', () => {
            instance.getAllCountries.should.be.a('function');
        });

        it('should return all countries', () => {
            instance.getAllCountries().should.deep.equal(countries);
        });
    });

    describe('getOverseasCountries', () => {
        it('should be a function', () => {
            instance.getOverseasCountries.should.be.a('function');
        });

        it('should return the value of the _overseasCountries array', () => {
            instance._overseasCountries = [
                { countryCode: 'AA', countryNameSlug: 'foo' }
            ];
            instance.getOverseasCountries().should.deep.equal([
                { countryCode: 'AA', countryNameSlug: 'foo' }
            ]);
        });
    });

    describe('getResidenceCountries', () => {
        it('should be a function', () => {
            instance.getResidenceCountries.should.be.a('function');
        });

        it('should return the value of the _residenceCountries array', () => {
            instance._residenceCountries = [
                { countryCode: 'AA', countryNameSlug: 'foo' }
            ];
            instance.getResidenceCountries().should.deep.equal([
                { countryCode: 'AA', countryNameSlug: 'foo' }
            ]);
        });
    });

    describe('getResidenceCountriesForContact', () => {
        it('should be a function', () => {
            instance.getResidenceCountriesForContact.should.be.a('function');
        });

        it('should return the value of the _residenceCountries array, filtering out non-permitted values', () => {
            instance._residenceCountries = [
                { countryCode: 'AA', countryNameSlug: 'foo' },
                { countryCode: 'PJ', countryNameSlug: 'palestine-west-bank' },
                { countryCode: 'PZ', countryNameSlug: 'palestine-gaza' },
            ];
            instance.getResidenceCountriesForContact().should.deep.equal([
                { countryCode: 'AA', countryNameSlug: 'foo' }
            ]);
        });
    });


    describe('getOverseasResidenceCountries', () => {
        it('should be a function', () => {
            instance.getOverseasResidenceCountries.should.be.a('function');
        });

        it('should return the value of the _overseasResidenceCountries array', () => {
            instance._overseasResidenceCountries = [
                { countryCode: 'AA', countryNameSlug: 'foo' }
            ];
            instance.getOverseasResidenceCountries().should.deep.equal([
                { countryCode: 'AA', countryNameSlug: 'foo' }
            ]);
        });
    });

    describe('getOverseasBirthCountries', () => {
        it('should be a function', () => {
            instance.getOverseasBirthCountries.should.be.a('function');
        });

        it('should return the value of the _overseasBirthCountries array', () => {
            instance._overseasBirthCountries = [
                { countryCode: 'BA', countryNameSlug: 'bar' }
            ];
            instance.getOverseasBirthCountries().should.deep.equal([
                { countryCode: 'BA', countryNameSlug: 'bar' }
            ]);
        });
    });

    describe('getBirthCountries', () => {
        it('should be a function', () => {
            instance.getBirthCountries.should.be.a('function');
        });

        it('should return the value of the _birthCountries array', () => {
            instance._birthCountries = [
                { countryCode: 'BA', countryNameSlug: 'bar' }
            ];
            instance.getBirthCountries().should.deep.equal([
                { countryCode: 'BA', countryNameSlug: 'bar' }
            ]);
        });
    });

    describe('getCountryById', () => {
        it('should be a function', () => {
            instance.getCountryById.should.be.a('function');
        });

        it('should get a country by its ID', () => {
            instance._indexCountries();
            instance.getCountryById('GB').should.deep.equal(unitedKingdom);
        });

        it('should transform UK to GB and get a country by its id', () => {
            instance._indexCountries();
            instance.getCountryById('UK').should.deep.equal(unitedKingdom);
        });

        it('should return null if no ID is supplied', () => {
            instance._indexCountries();
            expect(instance.getCountryById()).to.equal(null);
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.getCountryById('??')).to.equal(undefined);
        });
    });

    describe('getCountryBySlug', () => {
        it('should be a function', () => {
            instance.getCountryBySlug.should.be.a('function');
        });

        it('should get a country by its slug', () => {
            instance._indexCountries();
            instance.getCountryBySlug('united-kingdom').should.deep.equal(unitedKingdom);
        });

        it('should return null if no slug is supplied', () => {
            instance._indexCountries();
            expect(instance.getCountryBySlug()).to.equal(null);
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.getCountryBySlug('not-found')).to.equal(undefined);
        });
    });

    describe('getCountryByDisplayName', () => {
        it('should be a function', () => {
            instance.getCountryByDisplayName.should.be.a('function');
        });

        it('should get a country by its display name', () => {
            instance._indexCountries();
            instance.getCountryByDisplayName('United Kingdom').should.deep.equal(unitedKingdom);
        });

        it('should return null if no display name is supplied', () => {
            instance._indexCountries();
            expect(instance.getCountryByDisplayName()).to.equal(null);
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.getCountryByDisplayName('not-found')).to.equal(undefined);
        });
    });

    describe('getCountryDataById', () => {
        it('should be a function', () => {
            instance.getCountryDataById.should.be.a('function');
        });

        it('should get country data by its ID', () => {
            instance._indexCountries();
            instance.getCountryDataById('GB').should.deep.equal(
                {
                    addressCountryFlag: true,
                    countryCode: 'GB',
                    countryNameSlug: 'united-kingdom',
                    countryOfBirthFlag: true,
                    displayName: 'United Kingdom',
                    displayNameWelsh: 'Welsh United Kingdom',
                    status: 'ACTIVE',
                    channel: 'ONLINE',
                    contentType: 1
                }
            );
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.getCountryDataById('??')).to.equal(undefined);
        });
    });

    describe('getCountryDataBySlug', () => {
        it('should be a function', () => {
            instance.getCountryDataBySlug.should.be.a('function');
        });

        it('should get country data by its slug', () => {
            instance._indexCountries();
            instance.getCountryDataBySlug('united-kingdom').should.deep.equal({
                addressCountryFlag: true,
                countryCode: 'GB',
                countryNameSlug: 'united-kingdom',
                displayName: 'United Kingdom',
                displayNameWelsh: 'Welsh United Kingdom',
                countryOfBirthFlag: true,
                channel: 'ONLINE',
                status: 'ACTIVE',
                contentType: 1
            });
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.getCountryDataBySlug('??')).to.equal(undefined);
        });
    });

    describe('isRestrictedById', () => {
        it('should be a function', () => {
            instance.isRestrictedById.should.be.a('function');
        });

        it('should return true for a country that is restricted', () => {
            instance._indexCountries();
            instance.isRestrictedById('NA').should.equal(true);
        });

        it('should return false for a country that is not restricted', () => {
            instance._indexCountries();
            instance.isRestrictedById('GB').should.equal(false);
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.isRestrictedById('??')).to.equal(undefined);
        });
    });

    describe('areNewApplicationsStoppedForId', () => {
        it('should be a function', () => {
            instance.areNewApplicationsStoppedForId.should.be.a('function');
        });

        it('should return true for a country that is has applications stopped', () => {
            instance._indexCountries();
            instance.areNewApplicationsStoppedForId('BA').should.equal(true);
        });

        it('should return false for a country that does not have applications stopped', () => {
            instance._indexCountries();
            instance.areNewApplicationsStoppedForId('AA').should.equal(false);
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.areNewApplicationsStoppedForId('??')).to.equal(undefined);
        });
    });

    describe('isActiveById', () => {
        it('should be a function', () => {
            instance.isActiveById.should.be.a('function');
        });

        it('should return true for a country that is active', () => {
            instance._indexCountries();
            instance.isActiveById('GB').should.equal(true);
        });

        it('should return false for a country that is not active', () => {
            instance._indexCountries();
            instance.isActiveById('NA').should.equal(false);
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.isActiveById('??')).to.equal(undefined);
        });
    });

    describe('getSlugById', () => {
        it('should be a function', () => {
            instance.getSlugById.should.be.a('function');
        });

        it('should get country slug when the id is given', () => {
            instance._indexCountries();
            instance.getSlugById('GB').should.equal('united-kingdom');
        });

        it('should return undefined if country is not found', () => {
            instance._indexCountries();
            expect(instance.getSlugById('??')).to.equal(undefined);
        });
    });

    describe('_indexCountries', () => {
        it('should be a function', () => {
            instance._indexCountries.should.be.a('function');
        });

        it('should set _overseasCountries to all countries except GB', () => {
            instance._indexCountries();
            instance._overseasCountries.should.deep.equal([
                foo, bar, narnia
            ]);
        });

        it('should set _residenceCountries to all countries where addressCountryFlag is true', () => {
            instance._indexCountries();
            instance._residenceCountries.should.deep.equal([
                foo, unitedKingdom
            ]);
        });

        it('should set _overseasResidenceCountries to all countries where countryCode is not GB and addressCountryFlag is true', () => {
            instance._indexCountries();
            instance._overseasResidenceCountries.should.deep.equal([
                foo
            ]);
        });

        it('should set _overseasBirthCountries to all countries where countryCode is not GB and countryOfBirthFlag is true', () => {
            instance._indexCountries();
            instance._overseasBirthCountries.should.deep.equal([
                bar
            ]);
        });

        it('should set _birthCountries to all countries where countryOfBirthFlag is true', () => {
            instance._indexCountries();
            instance._birthCountries.should.deep.equal([
                unitedKingdom, bar
            ]);
        });

        it('should index countries by id', () => {
            instance._indexCountries();
            instance._countriesById.should.deep.equal({
                GB: unitedKingdom,
                AA: foo,
                BA: bar,
                NA: narnia
            });
        });

        it('should index countries by slug', () => {
            instance._indexCountries();
            instance._countriesBySlug.should.deep.equal({
                'united-kingdom': unitedKingdom,
                'foo': foo,
                'bar': bar,
                'narnia': narnia
            });
        });

        it('should index countries by display name', () => {
            instance._indexCountries();
            instance._countriesByDisplayName.should.deep.equal({
                'United Kingdom': unitedKingdom,
                'Foo': foo,
                'Bar': bar,
                'Narnia': narnia
            });
        });
    });

    describe('dropdownList', () => {
        it('turns a list of countries into sorted drop down select box options', () => {
            const items = instance.dropdownList(countries, false, false);

            items.should.deep.equal([
                { value: 'BA', text: 'Bar', label: 'Bar' },
                { value: 'AA', text: 'Foo', label: 'Foo' },
                { value: 'NA', text: 'Narnia', label: 'Narnia' },
                { value: 'GB', text: 'United Kingdom', label: 'United Kingdom' },
            ]);
        });

        it('turns a list of countries into sorted drop down select box options with GB at the top', () => {
            const items = instance.dropdownList(countries, false);

            items.should.deep.equal([
                { value: 'GB', text: 'United Kingdom', label: 'United Kingdom' },
                { value: 'BA', text: 'Bar', label: 'Bar' },
                { value: 'AA', text: 'Foo', label: 'Foo' },
                { value: 'NA', text: 'Narnia', label: 'Narnia' }
            ]);
        });

        it('turns a list of countries into sorted drop down select box options with GB at the top using Welsh displayNames', () => {
            const items = instance.dropdownList(countries, true);

            items.should.deep.equal([
                { value: 'GB', text: 'Welsh United Kingdom', label: 'Welsh United Kingdom' },
                { value: 'BA', text: 'Welsh Bar', label: 'Welsh Bar' },
                { value: 'AA', text: 'Welsh Foo', label: 'Welsh Foo' },
                { value: 'NA', text: 'Welsh Narnia', label: 'Welsh Narnia' }
            ]);
        });
    });

    describe('sortCountryList', () => {
        it('turns a list of countries into sorted list with GB at the top', () => {
            const items = instance.sortCountryList(countries, true);

            items.should.deep.equal([unitedKingdom, bar, foo, narnia]);
        });

        it('turns a list of countries into sorted list with GB at the top by default when flag not provided', () => {
            const items = instance.sortCountryList(countries);

            items.should.deep.equal([unitedKingdom, bar, foo, narnia]);
        });

        it('turns a list of countries into sorted list', () => {
            const items = instance.sortCountryList(countries, false);

            items.should.deep.equal([bar, foo, narnia, unitedKingdom]);
        });
    });

    describe('dropdownListBirthCountries', () => {
        it('turns a list of countries into drop down select box options', () => {
            instance._indexCountries();
            const items = instance.dropdownListBirthCountries();

            items.should.deep.equal([
                { value: 'GB', text: 'United Kingdom', label: 'United Kingdom' },
                { value: 'BA', text: 'Bar', label: 'Bar' }
            ]);
        });

        it('turns a list of countries into drop down select box options in welsh', () => {
            instance._indexCountries();
            const items = instance.dropdownListBirthCountries(true);

            items.should.deep.equal([
                { value: 'GB', text: 'Welsh United Kingdom', label: 'Welsh United Kingdom' },
                { value: 'BA', text: 'Welsh Bar', label: 'Welsh Bar' }
            ]);
        });
    });

    describe('dropdownListOverseasBirthCountries', () => {
        it('turns a list of countries into drop down select box options', () => {
            instance._indexCountries();
            const items = instance.dropdownListOverseasBirthCountries();

            items.should.deep.equal([
                { value: 'BA', text: 'Bar', label: 'Bar' }
            ]);
        });

        it('turns a list of countries into drop down select box options in welsh', () => {
            instance._indexCountries();
            const items = instance.dropdownListOverseasBirthCountries(true);

            items.should.deep.equal([
                { value: 'BA', text: 'Welsh Bar', label: 'Welsh Bar' }
            ]);
        });
    });

    describe('dropdownListResidenceCountries', () => {
        it('turns a list of countries into drop down select box options', () => {
            instance._indexCountries();
            const items = instance.dropdownListResidenceCountries();

            items.should.deep.equal([
                { value: 'GB', text: 'United Kingdom', label: 'United Kingdom' },
                { value: 'AA', text: 'Foo', label: 'Foo' }
            ]);
        });

        it('turns a list of countries into drop down select box options in welsh', () => {
            instance._indexCountries();
            const items = instance.dropdownListResidenceCountries(true);

            items.should.deep.equal([
                { value: 'GB', text: 'Welsh United Kingdom', label: 'Welsh United Kingdom' },
                { value: 'AA', text: 'Welsh Foo', label: 'Welsh Foo' }
            ]);
        });
    });

    describe('dropdownListOverseasResidenceCountries', () => {
        it('turns a list of countries into drop down select box options', () => {
            instance._indexCountries();
            const items = instance.dropdownListOverseasResidenceCountries();

            items.should.deep.equal([
                { value: 'AA', text: 'Foo', label: 'Foo' }
            ]);
        });

        it('turns a list of countries into drop down select box options in welsh', () => {
            instance._indexCountries();
            const items = instance.dropdownListOverseasResidenceCountries(true);

            items.should.deep.equal([
                { value: 'AA', text: 'Welsh Foo', label: 'Welsh Foo' }
            ]);
        });
    });

    describe('onFail logger', () => {
        let settings;

        beforeEach(() => {
            settings = {
                method: 'GET',
                url: 'http://example.com/test/path'
            };
        });

        it('should log the returned error message', () => {
            const err = new Error('test');
            err.body = '<body><tag>error text</tag></body>';
            instance.onFail(err, {}, settings, 123, 1234567);
            stubs.logger.outbound.should.have.been.calledWithExactly(
                'Countries CachedModel request failed :outVerb :outRequest :outResponseCode :outError',
                {
                    outVerb: 'GET',
                    outRequest: 'http://example.com/test/path',
                    outResponseCode: 123,
                    outResponseTime: 1234567,
                    outError: 'test',
                    outErrorBody: '<body><tag>error text</tag></body>'
                }
            );
        });

        it('should log the data error message', () => {
            instance.onFail({}, { error: 'test' }, settings, 123, 1234567);
            stubs.logger.outbound.args[0][1].outError.should.equal('test');
        });

        it('should log an empty string if no error is available', () => {
            instance.onFail({}, {}, settings, 123, 1234567);
            stubs.logger.outbound.args[0][1].outError.should.equal('');
        });
    });

    describe('onError logger', () => {
        it('should log the returned error message', () => {
            let err = new Error('test');
            instance.onError(err);
            stubs.logger.outbound.should.have.been.calledWithExactly(
                'Countries CachedModel request error :err.message',
                err
            );
        });
    });
});
