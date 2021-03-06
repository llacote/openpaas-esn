'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The event-quick-form Angular module directives', function() {
  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('esn.calendar');
    this.gracePeriodService = {
      hasTaskFor: function() {}
    };
    var self = this;
    angular.mock.module(function($provide) {
      $provide.value('gracePeriodService', self.gracePeriodService);
    });
  });

  describe('submit fn', function() {
    var spyNewEvent = sinon.spy();
    var spyModifyEvent = sinon.spy();
    beforeEach(function() {
      angular.mock.module(function($provide, $controllerProvider) {
        $controllerProvider.register('eventFormController', function($scope) {
          $scope.event = {};
          $scope.editedEvent = {};
          this.initFormData = function() {};
          this.isNew = function() {
            return !$scope.selectedEvent._id;
          };
          this.addNewEvent = spyNewEvent;
          this.modifyEvent = spyModifyEvent;
        });
      });
    });

    beforeEach(angular.mock.inject(function($compile, $rootScope, moment) {
      this.$compile = $compile;
      this.$rootScope = $rootScope;
      this.$scope = this.$rootScope.$new();
      this.moment = moment;

      this.initDirective = function(scope) {
        var html = '<event-quick-form/>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        return element;
      };
    }));

    it('should have a submit function that is addNewEvent', function() {
      this.$scope.selectedEvent = {
        allDay: true,
        start: this.moment('2013-02-08 12:30'),
        end: this.moment('2013-02-08 13:30'),
        location: 'aLocation'
      };
      this.initDirective(this.$scope);
      this.$scope.submit();
      expect(spyNewEvent).to.have.been.called;
    });

    it('should have a submit function that is modifyEvent', function() {
      this.$scope.selectedEvent = {
        _id: '12345',
        allDay: true,
        start: this.moment('2013-02-08 12:30'),
        end: this.moment('2013-02-08 13:30'),
        location: 'aLocation'
      };
      this.initDirective(this.$scope);
      this.$scope.submit();
      expect(spyModifyEvent).to.have.been.called;
    });
  });

  describe('The eventQuickForm directive', function() {
    beforeEach(angular.mock.inject(function($timeout, $compile, $rootScope, moment, calendarUtils, eventService) {
      this.$timeout = $timeout;
      this.$compile = $compile;
      this.$rootScope = $rootScope;
      this.$scope = this.$rootScope.$new();
      this.moment = moment;
      this.calendarUtils = calendarUtils;
      this.eventService = eventService;

      this.initDirective = function(scope) {
        var html = '<event-quick-form/>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        return element;
      };
    }));

    it('should have a focusSubmitButton method', function() {
      var element = this.initDirective(this.$scope);
      var submitButton = element.find('button[type="submit"]')[1];
      element.appendTo(document.body);
      this.$scope.focusSubmitButton();
      this.$timeout.flush();
      expect(document.activeElement).to.deep.equal(submitButton);
      element.remove();
    });

    it('should focus submit button on start date blur', function(done) {
      var element = this.initDirective(this.$scope);
      var startDateElement = element.find('input[bs-datepicker]').first();

      this.$scope.focusSubmitButton = done;
      this.$scope.$digest();
      startDateElement.appendTo(document.body);
      startDateElement.blur();
      this.$timeout.flush();
      startDateElement.remove();
    });

    it('should focus submit button on end date blur', function(done) {
      var element = this.initDirective(this.$scope);
      var endDateElement = element.find('input[bs-datepicker]').last();

      this.$scope.focusSubmitButton = done;
      this.$scope.$digest();
      endDateElement.appendTo(document.body);
      endDateElement.blur();
      this.$timeout.flush();
      endDateElement.remove();
    });

    it('should focus submit button on start time blur', function(done) {
      var element = this.initDirective(this.$scope);
      var startDateElement = element.find('input[bs-timepicker]').first();

      this.$scope.focusSubmitButton = done;
      this.$scope.$digest();
      startDateElement.appendTo(document.body);
      startDateElement.blur();
      this.$timeout.flush();
      startDateElement.remove();
    });

    it('should focus submit button on end time blur', function(done) {
      var element = this.initDirective(this.$scope);
      var endDateElement = element.find('input[bs-timepicker]').last();

      this.$scope.focusSubmitButton = done;
      this.$scope.$digest();
      endDateElement.appendTo(document.body);
      endDateElement.blur();
      this.$timeout.flush();
      endDateElement.remove();
    });

    it('should focus submit button on allday change', function(done) {
      var element = this.initDirective(this.$scope);
      var alldayElement = element.find('input[type="checkbox"]');

      this.$scope.focusSubmitButton = done;
      this.$scope.$digest();
      alldayElement.appendTo(document.body);
      var ngModelController = alldayElement.controller('ngModel');
      ngModelController.$setViewValue(true);
      this.$timeout.flush();
      alldayElement.remove();
    });

    it('should initiate $scope.editedEvent and $scope.event from $scope.selectedEvent', function() {
      this.$scope.selectedEvent = {
        allDay: true,
        start: this.moment('2013-02-08 12:30'),
        end: this.moment('2013-02-08 13:30'),
        location: 'aLocation'
      };
      this.initDirective(this.$scope);
      expect(this.$scope.editedEvent).to.shallowDeepEqual({
        allDay: true,
        location: 'aLocation'
      });
      expect(this.$scope.event).to.shallowDeepEqual({
        allDay: true,
        location: 'aLocation'
      });
    });

    it('should initiate $scope.editedEvent with default values if $scope.event does not exists', function() {
      this.initDirective(this.$scope);
      expect(this.moment(this.$scope.editedEvent.start).isSame(this.calendarUtils.getNewStartDate())).to.be.true;
      expect(this.moment(this.$scope.editedEvent.end).isSame(this.calendarUtils.getNewEndDate())).to.be.true;
      expect(this.$scope.editedEvent.allDay).to.be.false;
    });

    it('should reset eventService events on element $destroy', function() {
      this.eventService.originalEvent = { aEvent: 'aEvent' };
      this.eventService.editedEvent = { aEvent: 'aEvent' };
      var element = this.initDirective(this.$scope);
      element.remove();

      expect(this.eventService.originalEvent).to.deep.equal({});
      expect(this.eventService.editedEvent).to.deep.equal({});
    });

    it('should prevent default back behavior when closeModal is shown', function(done) {
      this.initDirective(this.$scope);
      this.$scope.createModal = {
        $isShown: true,
        hide: function() {
          done();
        }
      };
      var event = this.$scope.$broadcast('$locationChangeStart');
      expect(event.defaultPrevented).to.be.true;
      expect(this.$scope.closeModal).toHaveBeenCalled();
    });

    it('should not prevent default back behavior when closeModal is not shown', function() {
      this.initDirective(this.$scope);
      this.$scope.createModal = {
        $isShown: false,
        hide: function() {
        }
      };
      var event = this.$scope.$broadcast('$locationChangeStart');
      expect(event.defaultPrevented).to.be.false;
    });

    it('should not prevent default back behavior when closeModal is undefined', function() {
      this.initDirective(this.$scope);
      var event = this.$scope.$broadcast('$locationChangeStart');
      expect(event.defaultPrevented).to.be.false;
    });
  });
});
