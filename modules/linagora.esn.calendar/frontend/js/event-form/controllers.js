'use strict';

angular.module('esn.calendar')

  .controller('eventFormController', function($scope, $alert, calendarUtils, calendarService, eventService, session, notificationFactory, gracePeriodService, EVENT_FORM, EVENT_MODIFY_COMPARE_KEYS) {

    $scope.event = eventService.originalEvent;
    $scope.editedEvent = eventService.editedEvent;
    $scope.restActive = false;
    $scope.EVENT_FORM = EVENT_FORM;

    this.isNew = function(event) {
      return angular.isUndefined(event._id);
    };

    function _displayError(err) {
      $alert({
        content: err.message || err.statusText,
        type: 'danger',
        show: true,
        position: 'bottom',
        container: '.event-create-error-message',
        duration: '2',
        animation: 'am-flip-x'
      });
    }

    this.initFormData = function() {
      if ($scope.selectedEvent) {
        eventService.copyEventObject($scope.selectedEvent, $scope.event);
        eventService.copyEventObject($scope.selectedEvent, $scope.editedEvent);
      } else if (!$scope.event.start) {
        $scope.event = {
          start: calendarUtils.getNewStartDate(),
          end: calendarUtils.getNewEndDate(),
          allDay: false
        };
        eventService.copyEventObject($scope.event, $scope.editedEvent);
      }

      $scope.newAttendees = [];

      $scope.invitedAttendee = null;
      $scope.hasAttendees = !!$scope.editedEvent.attendees;

      if ($scope.hasAttendees) {
        $scope.editedEvent.attendees.forEach(function(attendee) {
          if (attendee.email in session.user.emailMap) {
            $scope.invitedAttendee = attendee;
          }
        });
      }
      $scope.isOrganizer = eventService.isOrganizer($scope.event);
    };

    function _hideModal() {
      if ($scope.createModal) {
        $scope.createModal.hide();
      }
    }

    function _displayNotification(notificationFactoryFunction, title, content) {
      notificationFactoryFunction(title, content);
      _hideModal();
    }

    this.canPerformCall = function() {
      return !$scope.restActive && !gracePeriodService.hasTaskFor({id: $scope.editedEvent.id});
    };

    this.addNewEvent = function() {
      if (!$scope.editedEvent.title || $scope.editedEvent.title.trim().length === 0) {
        $scope.editedEvent.title = EVENT_FORM.title.default;
      }

      if (!$scope.calendarId) {
        $scope.calendarId = calendarService.calendarId;
      }

      if ($scope.newAttendees) {
        $scope.editedEvent.attendees = $scope.newAttendees;
      }

      var event = $scope.editedEvent;
      var displayName = session.user.displayName || calendarUtils.displayNameOf(session.user.firstname, session.user.lastname);
      event.organizer = {
        displayName: displayName,
        emails: session.user.emails
      };
      var path = '/calendars/' + $scope.calendarId + '/events';
      var vcalendar = calendarService.shellToICAL(event);
      $scope.restActive = true;
      _hideModal();
      calendarService.create(path, vcalendar, { graceperiod: true })
        .catch (function(err) {
          _displayNotification(notificationFactory.weakError, 'Event creation failed', (err.statusText || err) + ', ' + 'Please refresh your calendar');
        })
        .finally (function() {
          $scope.restActive = false;
        });
    };

    this.deleteEvent = function() {
      if (!$scope.calendarId) {
        $scope.calendarId = calendarService.calendarId;
      }
      $scope.restActive = true;
      _hideModal();
      calendarService.remove($scope.event.path, $scope.event, $scope.event.etag)
        .catch (function(err) {
          _displayNotification(notificationFactory.weakError, 'Event deletion failed', (err.statusText || err) + ', ' + 'Please refresh your calendar');
        })
        .finally (function() {
          $scope.restActive = false;
        });
    };

    this.modifyEvent = function() {
      if ($scope.isOrganizer) {
        modifyOrganizerEvent();
      } else {
        modifyAttendeeEvent();
      }
    };

    function modifyAttendeeEvent() {
      var status = $scope.invitedAttendee.partstat;

      $scope.restActive = true;
      calendarService.changeParticipation($scope.editedEvent.path, $scope.event, session.user.emails, status).then(function(response) {
        if (!response) {
          return _hideModal();
        }
        var icalPartStatToReadableStatus = Object.create(null);
        icalPartStatToReadableStatus.ACCEPTED = 'You will attend this meeting';
        icalPartStatToReadableStatus.DECLINED = 'You will not attend this meeting';
        icalPartStatToReadableStatus.TENTATIVE = 'Your participation is undefined';
        _displayNotification(notificationFactory.weakInfo, 'Event participation modified', icalPartStatToReadableStatus[status]);
      }, function(err) {
        _displayNotification(notificationFactory.weakError, 'Event participation modification failed', (err.statusText || err) + ', ' + 'Please refresh your calendar');
      }).finally (function() {
        $scope.restActive = false;
      });
    }

    function modifyOrganizerEvent() {
      if (!$scope.editedEvent.title || $scope.editedEvent.title.trim().length === 0) {
        _displayError(new Error('You must define an event title'));
        return;
      }

      if (!$scope.calendarId) {
        $scope.calendarId = calendarService.calendarId;
      }

      if ($scope.editedEvent.attendees && $scope.newAttendees) {
        $scope.editedEvent.attendees = $scope.editedEvent.attendees.concat($scope.newAttendees);
      } else {
        $scope.editedEvent.attendees = $scope.newAttendees;
      }

      if (JSON.stringify($scope.editedEvent, EVENT_MODIFY_COMPARE_KEYS) === JSON.stringify($scope.event, EVENT_MODIFY_COMPARE_KEYS)) {
        if ($scope.createModal) {
          $scope.createModal.hide();
        }
        return;
      }
      $scope.restActive = true;
      _hideModal();
      var path = $scope.event.path || '/calendars/' + $scope.calendarId + '/events';
      calendarService.modify(path, $scope.editedEvent, $scope.event, $scope.event.etag, eventService.isMajorModification($scope.editedEvent, $scope.event))
        .catch (function(err) {
          _displayNotification(notificationFactory.weakError, 'Event modification failed', (err.statusText || err) + ', ' + 'Please refresh your calendar');
        })
        .finally (function() {
          $scope.restActive = false;
        });
    }

    this.changeParticipation = function(status) {
      if ($scope.isOrganizer && !$scope.invitedAttendee) {
        var organizer = angular.copy($scope.editedEvent.organizer);
        $scope.editedEvent.attendees.push(organizer);
        $scope.invitedAttendee = organizer;
      }

      $scope.invitedAttendee.partstat = status;
      $scope.$broadcast('event:attendees:updated');
    };
  });
