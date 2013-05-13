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
        firebase: firebaseConnection.child('applications')
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
        firebase: firebaseConnection.child('instances')
    });

    /**
     * The application view
     */
    var ApplicationView = Backbone.View.extend({
        template: _.template($('#template-application').html()),
        templateApplicationModal: _.template($('#template-application-modal-edit').html()),
        templateApplicationInstanceModal: _.template($('#template-application-instance-modal-edit').html()),

        modal: null,

        events: {
            'click .edit-application': 'editApp',
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
                serial: 0,
                service: '',
                name: '',
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
                serial: (parseInt(form.serial) + 1) // serial only used in saveInstance() below
            });
        },

        addInstance: function (e) {
            // Create a list of all available instances
            var instancesList = [];
            for (var i in this.instances.models) {
                instancesList.push(this.instances.models[i].id);
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

            // Increment a serial valie to force backbone to save changes to the instance object
            this.model.set({
                instances: instances,
                serial: (this.model.get('serial') + 1)
            });
        },

        removeInstance: function (e) {
            var instanceId = $(e.target).attr('data-instance-id');

            var instances = this.model.attributes.instances;
            for (var i in instances) {
                if (i == instanceId) {
                    delete instances[i];
                }
            }

            // Increment a serial valie to force backbone to save changes to the instance object
            this.model.set({
                instances: instances,
                serial: (this.model.get('serial') + 1)
            });
        }

    });

    var MainView = Backbone.View.extend({
        el: $("#applications"),

        initialize: function() {
            this.apps = new ApplicationList();
            this.instances = new InstanceList();
            this.listenTo(this.apps, 'add', this.addOne);
            this.listenTo(this.apps, 'reset', this.addAll);
        },

        addOne: function(application) {
            var view = new ApplicationView({model: application, instances: this.instances});
            this.$el.append(view.render().el);
        },

        addAll: function() {
            this.apps.each(this.addOne, this);
        }
    });

    var Main = new MainView();

    // Start the keepalive
    setInterval(function () {
        $.getJSON('/ping');
    }, 30000);
});
