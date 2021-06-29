# Ingress-teams-client

The goal of this project is to share info about portal keys between team members.
Client part based on [IngressLiveInventory](https://github.com/EisFrei/IngressLiveInventory) plugin 
and has the same id, so it replaces the original version.

## How it works and why is it needed

So you have a given secret token (UUID) which describes your team, and you also have a C.O.R.E. subscription. 
If you decide to upload your key information, anyone with the same token will be able to see your available keys
in the corresponding table or on the map. Just like you, look at the screenshots below.

If you haven't gotten the subscription, only token, you can also view the keys of the team members. But you can't
share the information about your keys for now, sorry :(

This plugin can be used for planning of the operations or for key transfer purposes.

## Plugin installation & features

* First of all, remove `LiveInventory` plugin if installed.

* Add plugin from https://github.com/agsh/ingress-teams-client/raw/main/ingress.teams.user.js
Then you'll see two new menu items in the portal info: `Inventory` and `Teams`.

  ![Portal info](https://github.com/agsh/ingress-teams-client/raw/main/img/f.png "Portal info")

* Add server address and team token at the bottom of the `Inventory` menu

  ![Inventory menu](https://github.com/agsh/ingress-teams-client/raw/main/img/h.png "Inventory menu")

  Also, here you can adjust the automatic key upload interval, or just disable it.

* Then upload your stats by pressing `Upload Keys` button from the `Inventory` menu

  ![Inventory menu](https://github.com/agsh/ingress-teams-client/raw/main/img/b.png "Inventory menu")

* Look at the all available keys from the team at the portal

  ![Portal info](https://github.com/agsh/ingress-teams-client/raw/main/img/c.png "Portal info")

* Look at the portal keys from your team on the map

  ![Team layer](https://github.com/agsh/ingress-teams-client/raw/main/img/d.png "Team layer")

* Look at all team keys in the table via `Teams` menu

  ![Team keys table](https://github.com/agsh/ingress-teams-client/raw/main/img/e.png "Team keys table")

  or just from the [API](https://gangleshanks.ga:4567/keys)
  
### Troubleshooting

https://askubuntu.com/questions/440649/how-to-disable-ipv6-in-ubuntu-14-04/484487#484487
