'use strict';

var mongoose = require('mongoose');
var async = require('async');
var localpubsub = require('../pubsub').local;
var globalpubsub = require('../pubsub').global;

var DEFAULT_LIMIT = 50;
var DEFAULT_OFFSET = 0;

var collaborationModels = {
  community: 'Community'
};

var collaborationLibs = {
  community: require('../community')
};

function getModel(objectType) {
  var modelName = collaborationModels[objectType];
  if (!modelName) {
    return;
  }
  var Model = mongoose.model(modelName);
  return Model;
}

function isMember(collaboration, tuple, callback) {
  if (!collaboration || !collaboration._id) {
    return callback(new Error('Collaboration object is required'));
  }

  var isInMembersArray = collaboration.members.some(function(m) {
    return m.member.objectType === tuple.objectType && m.member.id + '' === tuple.id + '';
  });
  return callback(null, isInMembersArray);
}

function getMembershipRequests(objectType, objetId, query, callback) {
  query = query || {};

  var Model = getModel(objectType);
  if (!Model) {
    return callback(new Error('Collaboration model ' + objectType + ' is unknown'));
  }

  var q = Model.findById(objetId);
  q.slice('membershipRequests', [query.offset || DEFAULT_OFFSET, query.limit || DEFAULT_LIMIT]);
  q.populate('membershipRequests.user');
  q.exec(function(err, community) {
    if (err) {
      return callback(err);
    }
    return callback(null, community ? community.membershipRequests : []);
  });
}

function getMembershipRequest(collaboration, user) {
  if (!collaboration.membershipRequests) {
    return false;
  }
  var mr = collaboration.membershipRequests.filter(function(mr) {
    return mr.user.equals(user._id);
  });
  return mr.pop();
}

function addMember(target, author, member, callback) {
  if (!target || !member) {
    return callback(new Error('Project and member are required'));
  }

  if (!target.save) {
    return callback(new Error('addMember(): first argument (target) must be a project mongoose model'));
  }

  if (!member.id || !member.objectType) {
    return callback(new Error('member must be {id, objectType}'));
  }

  var isMemberOf = target.members.filter(function(m) {
    return m.member.id.equals(member.id) && m.member.objectType === member.objectType;
  });

  if (isMemberOf.length) {
    return callback(null, target);
  }

  target.members.push({member: member, status: 'joined'});
  return target.save(function(err, update) {
    if (err) {
      return callback(err);
    }

    localpubsub.topic(target.objectType + ':member:add').forward(globalpubsub, {
      author: author,
      target: target,
      member: member
    });

    return callback(null, update);
  });
}

function query(objectType, q, callback) {
  q = q || {};

  var Model = getModel(objectType);
  if (!Model) {
    return callback(new Error('Collaboration model ' + objectType + ' is unknown'));
  }
  return Model.find(q, callback);
}

function queryOne(objectType, q, callback) {
  q = q || {};

  var Model = getModel(objectType);
  if (!Model) {
    return callback(new Error('Collaboration model ' + objectType + ' is unknown'));
  }
  return Model.findOne(q, callback);
}

function registerCollaborationModel(name, modelName, schema) {
  if (collaborationModels[name]) {
    throw new Error('Collaboration model ' + name + 'is already registered');
  }
  var model = mongoose.model(modelName, schema);
  collaborationModels[name] = modelName;
  return model;
}

function registerCollaborationLib(name, lib) {
  if (collaborationLibs[name]) {
    throw new Error('Collaboration lib for ' + name + 'is already registered');
  }
  collaborationLibs[name] = lib;
}

function findCollaborationFromActivityStreamID(id, callback) {
  var finders = [];

  function finder(type, callback) {
    queryOne(type, {'activity_stream.uuid': id}, function(err, result) {
      if (err || !result) {
        return callback();
      }
      return callback(null, result);
    });
  }

  for (var key in collaborationModels) {
    finders.push(async.apply(finder, key));
  }

  async.parallel(finders, function(err, results) {
    if (err) {
      return callback(err);
    }
    async.filter(results, function(item, callback) {
      return callback(!!item);
    }, function(results) {
      return callback(null, results);
    });
  });
}

function getCollaborationsForTuple(tuple, callback) {

  if (!tuple) {
    return callback(new Error('Tuple is required'));
  }

  var finders = [];

  function finder(type, callback) {

    query(type, {
      members: {$elemMatch: { 'member.objectType': tuple.objectType, 'member.id': tuple.id}}
    }, function(err, result) {
      if (err || !result) {
        return callback();
      }
      return callback(null, result);
    });
  }

  for (var key in collaborationModels) {
    finders.push(async.apply(finder, key));
  }

  async.parallel(finders, function(err, results) {
    if (err) {
      return callback(err);
    }

    results = results.reduce(function(a, b) {
      return a.concat(b);
    });
    return callback(null, results);
  });
}

function getStreamsForUser(userId, options, callback) {
  var finders = [];
  var results = [];

  function finder(type, callback) {
    collaborationLibs[type].getStreamsForUser(userId, options, function(err, streams) {
      if (err || !streams || !streams.length) {
        return callback();
      }
      results = results.concat(streams);
      return callback(null, null);
    });
  }

  for (var type in collaborationLibs) {
    if (collaborationLibs[type] && collaborationLibs[type].getStreamsForUser) {
      finders.push(async.apply(finder, type));
    }
  }

  async.parallel(finders, function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, results);
  });
}

function hasDomain(community) {
  if (!community || !community.domain_ids) {
    return false;
  }

  return community.domain_ids.some(function(domainId) {
    return domainId + '' === domainId + '';
  });
}

module.exports.query = query;
module.exports.queryOne = queryOne;
module.exports.schemaBuilder = require('../db/mongo/models/base-collaboration');
module.exports.registerCollaborationModel = registerCollaborationModel;
module.exports.registerCollaborationLib = registerCollaborationLib;
module.exports.getMembershipRequests = getMembershipRequests;
module.exports.getMembershipRequest = getMembershipRequest;
module.exports.isMember = isMember;
module.exports.addMember = addMember;
module.exports.getCollaborationsForTuple = getCollaborationsForTuple;
module.exports.findCollaborationFromActivityStreamID = findCollaborationFromActivityStreamID;
module.exports.getStreamsForUser = getStreamsForUser;
module.exports.permission = require('./permission');
module.exports.hasDomain = hasDomain;
