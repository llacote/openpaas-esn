'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The multi-input Angular module', function() {

  beforeEach(function() {
    angular.mock.module('esn.multi-input');
    module('jadeTemplates');
  });


  describe('The multiInputGroupAddress directive', function() {

    var element;

    beforeEach(inject(function(_$compile_, _$rootScope_, _$timeout_) {
      this.$rootScope = _$rootScope_;
      this.$scope = this.$rootScope.$new();
      this.$compile = _$compile_;
      this.$timeout = _$timeout_;
      this.initDirective = function(scope) {
        var html = '<multi-input-group-address multi-input-model="contact.addresses", multi-input-types="[]"></multi-input-group-address>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        this.eleScope = element.isolateScope();
        return element;
      };
    }));

    it('should load the existing content in inputs if there is', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: [
          {type: 'Home',
          street: 'Somewhere over the rainbow',
          zip: '777',
          city: 'Yolopolis',
          country: 'Yololand'},
          {type: 'Home',
          street: 'Somewhere else',
          zip: '666',
          city: 'Satantown',
          country: 'Hell'}
        ]
      };
      this.$scope.$digest();
      expect(this.eleScope.content.length).to.be.equal(2);
      expect(this.eleScope.showNextField).to.be.false;
    });
    it('should display a blank input if there is no existing content', function() {
      this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: []
      };
      this.$scope.$digest();
      expect(this.eleScope.content.length).to.be.equal(0);
      expect(this.eleScope.showNextField).to.be.true;
    });
    it('should display an "add a field button" when there is existing content', function() {
      this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: [
          {type: 'Home',
          street: 'Somewhere over the rainbow',
          zip: '777',
          city: 'Yolopolis',
          country: 'Yololand'},
          {type: 'Home',
          street: 'Somewhere else',
          zip: '666',
          city: 'Satantown',
          country: 'Hell'}
        ]
      };
      this.$scope.$digest();
      expect(this.eleScope.showAddButton).to.be.true;
    });
    it('should not display an "add a field button" when there is no existing content', function() {
      this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: []
      };
      this.$scope.$digest();
      expect(this.eleScope.showAddButton).to.be.false;
    });
    it('should add a blank field on click on "add a field" button', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: [
          {type: 'Home',
          street: 'Somewhere over the rainbow',
          zip: '777',
          city: 'Yolopolis',
          country: 'Yololand'},
          {type: 'Home',
          street: 'Somewhere else',
          zip: '666',
          city: 'Satantown',
          country: 'Hell'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      expect(this.eleScope.showAddButton).to.be.false;
      expect(this.eleScope.showNextField).to.be.true;
    });
    it('should set the focus on the newly created street field', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: [
          {type: 'Home',
          street: 'Somewhere over the rainbow',
          zip: '777',
          city: 'Yolopolis',
          country: 'Yololand'},
          {type: 'Home',
          street: 'Somewhere else',
          zip: '666',
          city: 'Satantown',
          country: 'Hell'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      expect(this.eleScope.showAddButton).to.be.false;
      expect(this.eleScope.showNextField).to.be.true;
      var spy = sinon.spy(element.find('.input-next')[0], 'focus');
      this.$timeout.flush();
      expect(spy).to.have.been.calledOnce;
    });
    it('should display an "add a field" button when the at least one of the new inputs is not empty', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: [
          {type: 'Home',
          street: 'Somewhere over the rainbow',
          zip: '777',
          city: 'Yolopolis',
          country: 'Yololand'},
          {type: 'Home',
          street: 'Somewhere else',
          zip: '666',
          city: 'Satantown',
          country: 'Hell'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      expect(this.eleScope.showAddButton).to.be.false;
      expect(this.eleScope.showNextField).to.be.true;
      this.eleScope.newItem = {
        type: 'Other',
        street: 'a',
        zip: '',
        city: '',
        country: ''
      };
      this.eleScope.verifyNew();
      expect(this.eleScope.showAddButton).to.be.true;
    });
    it('should not display an "add a field" button when the all the new input are empty', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: [
          {type: 'Home',
          street: 'Somewhere over the rainbow',
          zip: '777',
          city: 'Yolopolis',
          country: 'Yololand'},
          {type: 'Home',
          street: 'Somewhere else',
          zip: '666',
          city: 'Satantown',
          country: 'Hell'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      expect(this.eleScope.showAddButton).to.be.false;
      expect(this.eleScope.showNextField).to.be.true;
      this.eleScope.newItem = {
        type: 'Other',
        street: '',
        zip: '',
        city: '',
        country: ''
      };
      this.eleScope.verifyNew();
      expect(this.eleScope.showAddButton).to.be.false;
    });
    it('should remove existing input when user empty all the fields', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        addresses: [
          {type: 'Home',
          street: 'Somewhere over the rainbow',
          zip: '777',
          city: 'Yolopolis',
          country: 'Yololand'},
          {type: 'Home',
          street: 'Somewhere else',
          zip: '666',
          city: 'Satantown',
          country: 'Hell'}
        ]
      };
      this.$scope.$digest();
      this.eleScope.content = [
        {type: 'Home',
        street: '',
        zip: '',
        city: '',
        country: ''},
        {type: 'Home',
        street: 'Somewhere else',
        zip: '666',
        city: 'Satantown',
        country: 'Hell'}
      ];
      this.eleScope.verifyRemove(0);
      expect(this.eleScope.content).to.deep.equal([
        {type: 'Home',
        street: 'Somewhere else',
        zip: '666',
        city: 'Satantown',
        country: 'Hell'}
     ]);
    });
  });
  describe('The multiInputGroup directive', function() {

    var element;

    beforeEach(inject(function(_$compile_, _$rootScope_, _$timeout_) {
      this.$rootScope = _$rootScope_;
      this.$scope = this.$rootScope.$new();
      this.$compile = _$compile_;
      this.$timeout = _$timeout_;
      this.initDirective = function(scope) {
        var html = '<multi-input-group multi-input-model="contact.emails", multi-input-types="[]", multi-input-texttype="text", multi-input-placeholder="Email"></multi-input-group>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        this.eleScope = element.isolateScope();
        return element;
      };
    }));

    it('should load the existing content in inputs if there is', function() {
      this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: [
          {type: 'Home',
          value: 'home@mail.com'},
          {type: 'Work',
          value: 'work@mail.com'}
        ]
      };
      this.$scope.$digest();
      expect(this.eleScope.content.length).to.be.equal(2);
      expect(this.eleScope.showNextField).to.be.false;
    });
    it('should display a blank input if there is no existing content', function() {
      this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: []
      };
      this.$scope.$digest();
      expect(this.eleScope.content.length).to.be.equal(0);
      expect(this.eleScope.showNextField).to.be.true;
    });
    it('should display an "add a field button" when there is existing content', function() {
      this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: [
          {type: 'Home',
          value: 'home@mail.com'},
          {type: 'Work',
          value: 'work@mail.com'}
        ]
      };
      this.$scope.$digest();
      expect(this.eleScope.showAddButton).to.be.true;
    });
    it('should not display an "add a field button" when there is no existing content', function() {
      this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: []
      };
      this.$scope.$digest();
      expect(this.eleScope.showAddButton).to.be.false;
    });
    it('should add a blank field on click on "add a field" button', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: [
          {type: 'Home',
          value: 'home@mail.com'},
          {type: 'Work',
          value: 'work@mail.com'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      expect(this.eleScope.showAddButton).to.be.false;
      expect(this.eleScope.showNextField).to.be.true;
    });
    it('should set the focus on the newly created street field', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: [
          {type: 'Home',
          value: 'home@mail.com'},
          {type: 'Work',
          value: 'work@mail.com'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      expect(this.eleScope.showAddButton).to.be.false;
      expect(this.eleScope.showNextField).to.be.true;
      var spy = sinon.spy(element.find('.input-next')[0], 'focus');
      this.$timeout.flush();
      expect(spy).to.have.been.calledOnce;
    });
    it('should display an "add a field" button when the new input is not empty', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: [
          {type: 'Home',
          value: 'home@mail.com'},
          {type: 'Work',
          value: 'work@mail.com'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      this.eleScope.newItem = {
        type: 'Other',
        value: 'other@mail.com'
      };
      this.eleScope.verifyNew();
      expect(this.eleScope.showAddButton).to.be.true;
    });
    it('should not display an "add a field" button when the new input is empty', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: [
          {type: 'Home',
          value: 'home@mail.com'},
          {type: 'Work',
          value: 'work@mail.com'}
        ]
      };
      this.$scope.$digest();
      element.find('.multi-input-button').click();
      this.eleScope.newItem = {
        type: 'Other',
        value: ''
      };
      this.eleScope.verifyNew();
      expect(this.eleScope.showAddButton).to.be.false;
    });
    it('should remove existing input when user empty it', function() {
      element = this.initDirective(this.$scope);
      this.$scope.contact = {
        emails: [
          {type: 'Home',
          value: 'home@mail.com'},
          {type: 'Work',
          value: 'work@mail.com'}
        ]
      };
      this.$scope.$digest();
      this.eleScope.content = [
        {type: 'Home',
        value: ''},
        {type: 'Work',
        value: 'work@mail.com'}
      ];
      this.eleScope.verifyRemove(0);
      expect(this.eleScope.content).to.deep.equal([
       {type: 'Work',
       value: 'work@mail.com'}
      ]);
    });
  });
});
