# scriptable-public
## weather.js
See weather.js for details and /images for example images.

Weather- and location-data is cached, so it will always display something (even if there is no internet connection).

### General
This widget can be installed on your home screen mutiple times. It supports any widget size (see below for details).

It supports https://www.netatmo.com, https://openweathermap.org, https://www.wunderground.com and http://meteoalarm.eu .

Notice:
* If the data is read from the cache, the title (either city name, time, or both) will have the color red.
* If the current position is used, an arrow will be shown next to the city name, if the location is fixed, a target symbol will be shown.

The widget parameters can be used to configure:
* location
  * not set: use current location
  * set: always use the given location, ex: `{"location": {"latitude": 37.7749, "longitude": -122.4194}}`
* wundergroundStationId (see )
  * set: use the data of this station for the today view, ex. `{"wundergroundStationId": "KCASANFR1762"}`
* meteoalarm
  * not set: no meteoalarm data will be fetched
  * set: get data for given parameters and set background color and link according to severity level found in meteoalarms, ex: `{"meteoalarm": {"countryCode": "ES", "geocode": "ES511"}}`

These parameters can be set per installation, so you might for example create a stack of multiple forecasts for different cities with different alarm regions configured.

PS: the parameters are **one** json-array, ex. for combination: `{"location": {"latitude": 37.7749, "longitude": -122.4194}, "meteoalarm": {"countryCode": "ES", "geocode": "ES511"}}`

### Small Widget
Choose between netatmo or today view.

Additional widget parameter can be used to configure:
* smallWidgetStack
  * not set: use today view
  * set: use netatmo view: `{"smallWidgetStack": "netatmo"}`
  
### Medium Widget
Shows hourly and daily forecast.

### Large Widget
Shows netatmo and today view in top row and hourly and daily forecasts in botttom rows.

### Wunderground data
Since they do not provide an hourly api, the data is currently only used for the today view. If you want to use the medium or large widget, you still need to have a openweathermap api key.

Since they do not support online download of their icons, you need to download the pngs from https://openweathermap.org/img/wn/ and copy them into your iCloud directory:
`Scriptable/weatherCache/wundergroundIcons` 