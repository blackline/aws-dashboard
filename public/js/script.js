$(function(){
    var firebaseConnection = new Firebase(Config.Firebase.uri);
    firebaseConnection.auth(Config.Firebase.authToken, function(err) {
        if (err) {
            throw "Firebase auth failed: " +  err;
        }
    });

    /**
     * The application model
     */
    var Application = Backbone.Model.extend({
    });

    /**
     * The application collection
     */
    var ApplicationList = Backbone.Firebase.Collection.extend({
        model: Application,
        firebase: firebaseConnection.child('applications'),
        comparator: function (application) {
            return strtolower(application.get('name'));
        }
    });

    /**
     * The instance model
     */
    var Instance = Backbone.Model.extend({
    });

    /**
     * The instance collection
     */
    var InstanceList = Backbone.Firebase.Collection.extend({
        model: Instance,
        firebase: firebaseConnection.child('instances'),
        comparator: function (instance) {
            if (instance.has('DBInstanceIdentifier')) {
                return instance.get('DBInstanceIdentifier');
            } else if (instance.has('Tags')) {
                return strtolower(instance.get('Tags').name);
            }
        }
    });

    /**
     * The application view
     */
    var ApplicationView = Backbone.View.extend({
        template: _.template($('#template-application').html()),
        templateApplicationModal: _.template($('#template-application-modal-edit').html()),
        templateApplicationRemoveModal: _.template($('#template-application-modal-remove').html()),
        templateApplicationInstanceModal: _.template($('#template-application-instance-modal-edit').html()),
        templateApplicationInstanceRemoveModal: _.template($('#template-application-instance-modal-remove').html()),

        modal: null,

        events: {
            'click .edit-application': 'editApp',
            'click .remove-application': 'removeApp',
            'click .add-instance': 'addInstance',
            'click .remove-instance': 'removeInstance'
        },

        initialize: function() {
            _.bindAll(this, 'saveApp', 'saveInstance');
            this.instances = this.options.instances;

            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'remove', this.remove);

            this.listenTo(this.instances, 'add', this.render);
            this.listenTo(this.instances, 'change', this.render);
        },

        render: function() {
            var instances = [];
            for (var i in this.model.attributes.instances) {
                var appInstance = _.clone(this.model.attributes.instances[i]);
                var instanceDetails = _.find(this.instances.models, function (instance) {
                    return (appInstance.id == instance.id);
                });

                if (!_.isUndefined(instanceDetails)) {
                    appInstance.details = instanceDetails.attributes;
                }
                instances.push(appInstance);
            }

            var app = this.model.toJSON();
            app.instances = instances;

            this.$el.html(this.template(app));
            return this;
        },

        editApp: function() {
            // Render the modal to the page
            var app = _.defaults(this.model.toJSON(), {
                id: uniqid(),
                name: '',
                serial: 0,
                uri: ''
            });
            this.modal = $(this.templateApplicationModal(app)).appendTo('body');

            // Save the form when the save button in modal is clicked
            $(this.modal).on('click', '.save', this.saveApp);

            // Destroy the modal after it is closed
            $(this.modal).on('hidden', function () {
                $(this).unbind().remove();
            });

            // Display the modal
            this.modal.modal();
            return this;
        },

        saveApp: function () {
            var form = $(this.modal).find('form').serializeObject();

            this.model.set({
                id: form.id,
                name: form.name,
                uri: form.uri,
                serial: (parseInt(form.serial, 10) + 1) // serial only used in saveInstance() below
            });
        },

        addInstance: function (e) {
            // Create a list of all available instances
            var instancesList = {
                EC2: [],
                ElastiCache: [],
                RDS: []
            };

            var instances = this.instances.getUnusedInstances();
            for (var i in instances) {
                var type;
                if (instances[i].has('DBInstanceIdentifier')) {
                    type = 'RDS';
                } else if (instances[i].has('Hypervisor')) {
                    type = 'EC2';
                } else if (instances[i].has('CacheClusterId')) {
                    type = 'ElastiCache';
                } else {
                    console.log('Unknown instance type', instances[i]);
                }

                instancesList[type].push({
                    name: instances[i].id
                });
            }

            // Render the modal to the page
            this.modal = $(this.templateApplicationInstanceModal({list: instancesList})).appendTo('body');

            // Save the form when the save button in modal is clicked
            $(this.modal).on('click', '.save', this.saveInstance);
            $(this.modal).on('submit', 'form', function(e) { e.preventDefault(); });

            // Destroy the modal after it is closed
            $(this.modal).on('hidden', function () {
                $(this).unbind().remove();
            });

            // Display the modal
            this.modal.modal();
            return this;
        },

        saveInstance: function (e) {
            e.preventDefault();

            var form = $(this.modal).find('form').serializeObject();

            // What AWS product type is this instance?
            var instance = _.find(this.instances.models, function(instance) {
                return (form.id == instance.id);
            });

            var product;
            if (instance.has('DBInstanceStatus')) {
                product = 'rds';
            } else if (instance.has('PublicDnsName') && instance.get('PublicDnsName').match(/^(ec2)/)) {
                product = 'ec2';
            } else if (instance.has('CacheClusterId')) {
                product = 'elasticache';
            }

            var instances;
            if (this.model.has('instances')) {
                instances = this.model.get('instances');
            } else {
                instances = {};
            }

            instances[form.id] = {
                id: form.id,
                service: form.service,
                product: product
            };

            // Increment a serial value to force backbone to save changes to the instance object
            this.model.set({
                instances: instances,
                serial: (this.model.get('serial') + 1)
            });
        },

        removeInstance: function (e) {
            var instanceId = $(e.target).attr('data-instance-id');
            var instances = this.model.attributes.instances;
            var instance = null;
            for (var i in instances) {
                if (i == instanceId) {
                    instance = instances[i];
                }
            }

            this.modal = $(this.templateApplicationInstanceRemoveModal(instance)).appendTo('body');

            // Save the form when the save button in modal is clicked
            var self = this;
            $(this.modal).on('click', '.save', function (e) {
                // Remove the instance from the list
                var instances = self.model.attributes.instances;
                for (var i in instances) {
                    if (i == instanceId) {
                        delete instances[i];
                    }
                }

                // Increment a serial value to force backbone to save changes to the instance object
                self.model.set({
                    instances: instances,
                    serial: (self.model.get('serial') + 1)
                });
            });
            $(this.modal).on('submit', 'form', function(e) { e.preventDefault(); });

            // Destroy the modal after it is closed
            $(this.modal).on('hidden', function () {
                $(this).unbind().remove();
            });

            // Display the modal
            this.modal.modal();
            return this;
        },

        removeApp: function (e) {
            // Render the modal to the page
            var app = _.defaults(this.model.toJSON(), {
                id: uniqid(),
                name: '',
                serial: 0,
                uri: ''
            });
            this.modal = $(this.templateApplicationRemoveModal(app)).appendTo('body');

            // Save the form when the save button in modal is clicked
            var self = this;
            $(this.modal).on('click', '.save', function () {
                self.model.collection.remove(self.model);
            });
            $(this.modal).on('submit', 'form', function(e) { e.preventDefault(); });

            // Destroy the modal after it is closed
            $(this.modal).on('hidden', function () {
                $(this).unbind().remove();
            });

            // Display the modal
            this.modal.modal();
            return this;
        }

    });

    var MainView = Backbone.View.extend({
        el: $("#applications"),

        initialize: function() {
            this.apps = new ApplicationList();
            this.instances = new InstanceList();

            this.listenTo(this.apps, 'add', this.addOne);
            this.listenTo(this.apps, 'reset', this.resetAll);
            this.listenTo(this.apps, 'sort', this.resetAll);

            // Get a list of instances which are not used by any application
            var self = this;
            this.instances.getUnusedInstances = function () {
                var unusedInstances = [];
                for (var i=0; i < self.instances.models.length; i++) {
                    var instance = self.instances.models[i];
                    var instanceIsUnused = true;
                    for (var j=0; j < self.apps.models.length && instanceIsUnused; j++) {
                        for (var k in self.apps.models[j].attributes.instances) {
                            var appInstance = self.apps.models[j].attributes.instances[k];
                            if (instance.attributes.id == appInstance.id) {
                                instanceIsUnused = false;
                            }
                        }
                    }

                    if (instanceIsUnused) {
                        unusedInstances.push(instance);
                    }
                }

                return unusedInstances;
            };

            // Add an Application button
            $('.add-application').on('click', function () {
                var application = new Application({
                    id: uniqid(),
                    name: 'a new application',
                    serial: 0,
                    uri: ''
                });
                self.apps.add(application);
            });
        },

        addOne: function(application) {
            var view = new ApplicationView({model: application, instances: this.instances});
            this.$el.append(view.render().el);
        },

        addAll: function() {
            this.apps.each(this.addOne, this);
        },

        resetAll: function () {
            this.$el.empty();
            this.addAll();
        }
    });

    var Main = new MainView();
});
