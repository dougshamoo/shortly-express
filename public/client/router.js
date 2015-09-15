Shortly.Router = Backbone.Router.extend({
  initialize: function(options){
    this.$el = options.el;
  },

  routes: {
    '':       'index',
    'create': 'create',
    'logout': 'logout'
  },

  swapView: function(view){
    this.$el.html(view.render().el);
  },

  index: function(){
    var links = new Shortly.Links();
    var linksView = new Shortly.LinksView({ collection: links });
    this.swapView(linksView);
  },

  logout: function() {
    console.log('logging out');

    $.ajax({
      url: 'http://127.0.0.1:4568/logout',
      method: 'GET',
      success: function(data) {
        window.location = data;
      }
    });
  },

  create: function(){
    this.swapView(new Shortly.createLinkView());
  }
});
