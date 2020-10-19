// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: sun;

// Disclaimer
/////////////

// main script based on https://www.reddit.com/r/Scriptable/comments/j3jc8u/date_today_styled_widget_i_made_lately_inspired
// caching based on https://talk.automators.fm/t/widget-examples/7994/216
// netatmo based on https://github.com/CaptainMurdo/Scriptable/blob/master/AirWidget.js and https://gist.github.com/schl3ck/2009e6915d10036a916a1040cbb680ac
// widget alignment based on https://docs.scriptable.app/widgettext/#-centeraligntext

// Usage
////////

// Always: use widget preference to set location (ex. {"location": {"latitude": 37.7749, "longitude": -122.4194}). Current location will be used if non is set.
// Small Widget: use widget preference to choose between today or netamo stack (ex. {"smallWidgetStack": "today"}). Today stack will be used if non is set.

// MUST be changed
//////////////////

// make an account at https://openweathermap.org
const OPENWEATHER_API_KEY = ''

// make an account at https://dev.netatmo.com
const NETATMO_CLIENT_ID = '';
const NETATMO_CLIENT_SECRET = '';
const NETATMO_USERNAME = '';
const NETATMO_PASSWORD = '';
const NETATMO_DEVICE_MAC_ID = '';
const NETATMO_SCOPE = '';

// make an account at https://www.wunderground.com
const WUNDERGROUND_API_KEY = '';

// MAY be changed
/////////////////

// dev mode
const DEV_MODE = false; // true: run script in dev mode
const DEV_PREVIEW = 'large'; // widget size for dev mode
const DEV_MODE_WIDGET_PARAMETER = '{}'; // set desired widget parameters for dev mode
// const DEV_MODE_WIDGET_PARAMETER = '{"location": {"latitude": 37.7749, "longitude": -122.4194}, "smallWidgetStack": "netatmo", "meteoalarm": {"countryCode": "ES", "geocode": "ES511"}, "wundergroundStationId": "KCASANFR1762"}'; // ex. location: San Francisco, ex. smallStack Config: show netatmo instead of today in small widget, ex. meteoalarm: use ES/ES511 for meteoalarms, ex. wundergrounnd: San Francisco

// forecast (general)
const FORECAST_HOURS = 5; // recommended 4-6, depending on device (max. 48)
const FORECAST_DAYS = 5; // recommended 4-6, depending on device (max. 7)
const FORECAST_LANGUAGE_CODE = 'de' // language for text output of openweathermap.org

// openweathermap
const OPENWEATHERMAP_UNITS = 'metric' // metric for celsius and imperial for Fahrenheit

// wunderground
const WUNDERGROUND_UNITS = 'm' // m for metric, e for english, h for hybrid (UK)
var WUNDERGROUND_STATION_ID = '' // will be read from widgetParameters

// date formats (https://docs.scriptable.app/dateformatter/#dateformat)
const DAY_FORMAT = 'E';
const HOUR_FORMAT = 'HH';
const TIME_FORMAT = 'HH.mm';

// application urls
const NETATMO_URL = 'netatmo://'; // opens netatmo app when netatmo-stack is 'clicked'
const WEATHER_URL = 'wettercomuniversal://'; // opens weather app when today-stack or forecast-stack is 'clicked'

// icons
const OUTDOOR_ICON_NAME = 'figure.walk.circle';
const INDOOR_ICON_NAME = 'house.circle';
const SUNRISE_ICON_NAME = 'sunrise';
const SUNSET_ICON_NAME = 'sunset';
const LOCATION_ICON_NAME = 'location';
const FIXED_LOCATION_ICON_NAME = 'target';

// sizes (tweak depending on device)
const TOP_ROW_SIZE = new Size(0, 150);
const FORECAST_STACK_LARGE_SIZE = new Size(0, 85);
const FORECAST_STACK_MEDIUM_SIZE = new Size(0, 65);
const NETATMO_IMAGE_SIZE = new Size(35, 35);
const TODAY_SUNRISE_SET_SIZE = new Size(20, 20);
const LOCATION_ICON_SIZE = new Size(10, 10);

// meteoalarm colors
const METEOALARM_SEVERITY_MINOR_COLOR = new Color('#ffcb03');
const METEOALARM_SEVERITY_MODERATE_COLOR = new Color('#c66837');
const METEOALARM_SEVERITY_SEVERE_COLOR = new Color('#ff4a03');
const METEOALARM_SEVERITY_EXTREME_COLOR = new Color('#ff0329');

// modes https://docs.scriptable.app/device/#isusingdarkappearance is not supported in widgets, so you have to choose here
// normal mode
// const WIDGET_BACKGROUND_COLOR = new Color('#d6d6d6');
// const STACK_BACKGROUND_COLOR = new Color('#ffffff');
// const TEXT_COLOR = new Color('#000000');
// const WARNING_COLOR = new Color('#de1515'); // warnings (ex. cache data used)
// const TINT_COLOR = new Color('#000000'); // make SFImage visible

// dark mode
const WIDGET_BACKGROUND_COLOR = new Color('#000000');
const STACK_BACKGROUND_COLOR = new Color('#222222');
const TEXT_COLOR = new Color('#ffffff');
const WARNING_COLOR = new Color('#ff0000'); // warnings (ex. cache data used)
const TINT_COLOR = new Color('#ffffff'); // make SFImage visible


// DO NOT CHANGE
////////////////
// levels taken from https://www.oasis-open.org/committees/download.php/15135/emergency-CAPv1.1-Corrected_DOM.pdf
const METEOALARM_SEVERITIES = {
    'Minor': {'severity': 1, 'color': METEOALARM_SEVERITY_MINOR_COLOR},
    'Moderate': {'severity': 2, 'color': METEOALARM_SEVERITY_MODERATE_COLOR},
    'Severe': {'severity': 3, 'color': METEOALARM_SEVERITY_SEVERE_COLOR},
    'Extreme': {'severity': 4, 'color': METEOALARM_SEVERITY_EXTREME_COLOR},
};

if (config.runsInWidget || DEV_MODE) {

    let widgetFamily = (config.widgetFamily !== undefined) ? config.widgetFamily : DEV_PREVIEW;

    let widgetParameter = JSON.parse((args.widgetParameter !== null) ? args.widgetParameter : DEV_MODE_WIDGET_PARAMETER);
    if (DEV_MODE) {
        console.log(widgetParameter);
    }

    // create a global fileManager for cache access, must be var
    var fileManager;
    if (DEV_MODE) {
        fileManager = FileManager.iCloud();
    } else {
        fileManager = FileManager.local();
    }
    var cachePath = fileManager.joinPath(fileManager.documentsDirectory(), 'weatherCache');
    if (!fileManager.fileExists(cachePath)) {
        fileManager.createDirectory(cachePath);
    }
    var filePrefix = ''; // used to create cache files per script instance, if location is fixed

    let locationInformation = await getLocationInformation(widgetParameter.location);

    let widgetBackgroundColor = WIDGET_BACKGROUND_COLOR;
    var weatherUrl = WEATHER_URL;

    // set widget background color according to meteoalarm level
    if (widgetParameter.meteoalarm !== undefined) {
        let meteoalarmInfo = await getMeteoAlarmInfo(widgetParameter.meteoalarm);
        if (meteoalarmInfo.severity !== undefined) {
            widgetBackgroundColor = METEOALARM_SEVERITIES[meteoalarmInfo.severity].color;
        }
        if (meteoalarmInfo.url !== undefined) {
            weatherUrl = meteoalarmInfo.url;
        }
    }

    let widget = new ListWidget();
    widget.backgroundColor = widgetBackgroundColor;
    widget.setPadding(10, 10, 10, 10);

    let weatherForecast; // migh not be fetched, depending on stacks displayed

    if (widgetFamily === 'large' || widgetFamily === 'small') {

        let smallWidgetStack = (widgetParameter.smallWidgetStack !== undefined) ? widgetParameter.smallWidgetStack : 'today'; // default single small stack is today
        let todayWeatherProvider = (widgetParameter.wundergroundStationId) ? 'wunderground' : 'openweathermap'; // default wetaher provider is openweathermap

        let topRow = widget.addStack();
        topRow.layoutHorizontally();
        topRow.size = TOP_ROW_SIZE;

        if (widgetFamily === 'large' || (widgetFamily === 'small' && smallWidgetStack === 'netatmo')) {
            if (widgetFamily === 'small') { // stack url does not apply for small widgets, widget url has to be set (https://docs.scriptable.app/widgetstack/#url)
                widget.url = NETATMO_URL;
            }
            await addNetatmoStack(topRow, locationInformation);
            if (widgetFamily === 'large') {
                topRow.addSpacer();
            }
        }

        if (widgetFamily === 'large' || (widgetFamily === 'small' && smallWidgetStack === 'today')) {
            if (widgetFamily === 'small') { // stack url does not apply for small widgets, widget url has to be set (https://docs.scriptable.app/widgetstack/#url)
                widget.url = weatherUrl;
            }

            weatherForecast = await getWeatherData('openweathermap.json', fetchOpenweathermapData, locationInformation); // get the forecast from https://openweathermap.org
            if (todayWeatherProvider === 'openweathermap') {
                await addTodayStack(topRow, weatherForecast, locationInformation, convertOpenweathermapTodayForecast);
            } else {
                WUNDERGROUND_STATION_ID = widgetParameter.wundergroundStationId;
                let wundergroundForecast = await getWeatherData('wunderground.json', fetchWundergroundData, locationInformation); // get the forecast from https://openweathermap.org
                await addTodayStack(topRow, wundergroundForecast, locationInformation, convertWundergroundTodayForecast);
            }
        }

        if (widgetFamily === 'large') {
            widget.addSpacer();
        }
    }

    if (widgetFamily === 'medium') {
        weatherForecast = await getWeatherData('openweathermap.json', fetchOpenweathermapData, locationInformation); // get the forecast from https://openweathermap.org
        await addForecastStackTitle(widget, weatherForecast, locationInformation);
    }

    if (widgetFamily === 'large' || widgetFamily === 'medium') {
        // hourly weather stack
        await addForecastStack(widget, (weatherForecast !== undefined) ? weatherForecast.hourly.splice(0, FORECAST_HOURS) : null, convertHourlyForecast, widgetFamily);
        widget.addSpacer();

        // daily weather stack
        await addForecastStack(widget, (weatherForecast !== undefined) ? weatherForecast.daily.splice(0, FORECAST_DAYS) : null, convertDailyForecast, widgetFamily);
    }

    Script.setWidget(widget);

    // Beware: widget preview dimensions are not exactly the same as widget dimensions on home screen
    if (DEV_MODE) {
        if (DEV_PREVIEW === "small") {
            widget.presentSmall();
        }
        if (DEV_PREVIEW === "medium") {
            widget.presentMedium();
        }
        if (DEV_PREVIEW === "large") {
            widget.presentLarge();
        }
    }
}

Script.complete();

// stack methods
////////////////

async function addNetatmoStack(currentStack, locationInformation) {
    let netatmoStack = currentStack.addStack();
    netatmoStack.url = NETATMO_URL;
    netatmoStack.layoutVertically();
    netatmoStack.topAlignContent();
    netatmoStack.setPadding(7, 3, 7, 3)
    netatmoStack.backgroundColor = STACK_BACKGROUND_COLOR;
    netatmoStack.cornerRadius = 12;

    const netatmoData = await getWeatherData('netatmo.json', fetchNetatmoData, locationInformation); // get the data from https://dev.netatmo.com
    if (netatmoData !== undefined) {
        const dashboardData = netatmoData.dashboard_data;
        const modules = netatmoData.modules;

        let titleStack = netatmoStack.addStack();
        titleStack.layoutHorizontally();
        titleStack.addSpacer();
        let title = titleStack.addText(netatmoData.station_name);
        title.font = Font.semiboldSystemFont(12);
        title.textColor = TEXT_COLOR;
        title.textOpacity = 0.5;
        titleStack.addSpacer();

        let updateTimeStack = netatmoStack.addStack();
        updateTimeStack.layoutHorizontally();
        updateTimeStack.addSpacer();
        let time = updateTimeStack.addText(formatTimestamp(dashboardData.time_utc, TIME_FORMAT));
        time.font = Font.semiboldSystemFont(10);
        time.textColor = netatmoData.isCached ? WARNING_COLOR : TEXT_COLOR;
        time.textOpacity = 0.5;
        updateTimeStack.addSpacer();

        netatmoStack.addSpacer();

        let outdoorStack = netatmoStack.addStack();
        outdoorStack.layoutHorizontally();
        outdoorStack.centerAlignContent();
        addSfSymbol(outdoorStack, OUTDOOR_ICON_NAME, NETATMO_IMAGE_SIZE)
        outdoorStack.addSpacer(10);

        // not all modules might respond => try to read data
        let outdoorTemperature = (modules[2].dashboard_data !== undefined) ? modules[2].dashboard_data.Temperature.toFixed(1) : '?';
        let outdoorHumidity = (modules[2].dashboard_data !== undefined) ? modules[2].dashboard_data.Humidity : '?';
        let windStrength = (modules[0].dashboard_data !== undefined) ? modules[0].dashboard_data.WindStrength : '?';
        let rain = (modules[1].dashboard_data !== undefined) ? modules[1].dashboard_data.sum_rain_1.toFixed(1) : '?';

        // create the stack
        let outdoorDataStack = outdoorStack.addStack();
        outdoorDataStack.layoutVertically();
        let outdoorTemperatureTxt = outdoorDataStack.addText(outdoorTemperature + '° / ' + outdoorHumidity + '%');
        outdoorTemperatureTxt.font = Font.systemFont(12);
        outdoorTemperatureTxt.textColor = TEXT_COLOR;
        let windTxt = outdoorDataStack.addText(windStrength + ' kmh');
        windTxt.font = Font.systemFont(12);
        windTxt.textColor = TEXT_COLOR;
        let rainTxt = outdoorDataStack.addText(rain + ' mmh');
        rainTxt.font = Font.systemFont(12);
        rainTxt.textColor = TEXT_COLOR;

        netatmoStack.addSpacer();

        let indoorStack = netatmoStack.addStack();
        indoorStack.layoutHorizontally();
        indoorStack.centerAlignContent();
        addSfSymbol(indoorStack, INDOOR_ICON_NAME, NETATMO_IMAGE_SIZE)
        indoorStack.addSpacer(10);

        let indoorDataStack = indoorStack.addStack();
        indoorDataStack.layoutVertically();
        let indoorTemperatureTxt = indoorDataStack.addText(dashboardData.Temperature.toFixed(1) + '°');
        indoorTemperatureTxt.font = Font.systemFont(12);
        indoorTemperatureTxt.textColor = TEXT_COLOR;
        let indoorHumidityTxt = indoorDataStack.addText(dashboardData.Humidity + '%');
        indoorHumidityTxt.font = Font.systemFont(12);
        indoorHumidityTxt.textColor = TEXT_COLOR;
        let indoorCo2Txt = indoorDataStack.addText(dashboardData.CO2 + ' ppm');
        indoorCo2Txt.font = Font.systemFont(12);
        indoorCo2Txt.textColor = TEXT_COLOR;
    } else {
        let errorMessage = netatmoStack.addText('No data available!');
        errorMessage.font = Font.semiboldSystemFont(12);
        errorMessage.textColor = WARNING_COLOR;
    }
}

async function addTodayStack(currentStack, forecast, locationInformation, convertForecastCallable) {
    // top row => today weather stack
    let todayStack = currentStack.addStack();
    todayStack.url = weatherUrl;
    todayStack.layoutVertically();
    todayStack.topAlignContent();
    todayStack.setPadding(7, 3, 7, 3);
    todayStack.backgroundColor = STACK_BACKGROUND_COLOR;
    todayStack.cornerRadius = 12;

    if (forecast !== undefined) {

        const currentForecast = await convertForecastCallable(forecast);

        let titleStack = todayStack.addStack();
        titleStack.layoutHorizontally();
        titleStack.centerAlignContent();
        titleStack.addSpacer();
        addSfSymbol(titleStack, locationInformation.isFixed ? FIXED_LOCATION_ICON_NAME : LOCATION_ICON_NAME, LOCATION_ICON_SIZE);
        titleStack.addSpacer(3);
        let title = titleStack.addText(locationInformation.city);
        title.font = Font.semiboldSystemFont(12);
        title.textColor = locationInformation.isCached ? WARNING_COLOR : TEXT_COLOR;
        title.textOpacity = 0.5;
        titleStack.addSpacer();

        let updateTimeStack = todayStack.addStack();
        updateTimeStack.layoutHorizontally();
        updateTimeStack.addSpacer();
        let time = updateTimeStack.addText(currentForecast.timestamp);
        time.font = Font.semiboldSystemFont(10);
        time.textColor = forecast.isCached ? WARNING_COLOR : TEXT_COLOR;
        time.textOpacity = 0.5;
        updateTimeStack.addSpacer();

        todayStack.addSpacer();

        let subtitleStack = todayStack.addStack();
        subtitleStack.layoutHorizontally();
        subtitleStack.centerAlignContent();
        subtitleStack.addSpacer();
        addSfSymbol(subtitleStack, SUNRISE_ICON_NAME, TODAY_SUNRISE_SET_SIZE);
        subtitleStack.addSpacer(5);
        let sunriseText = subtitleStack.addText(currentForecast.sunriseTime);
        sunriseText.font = Font.systemFont(10);
        sunriseText.textColor = TEXT_COLOR;
        subtitleStack.addSpacer(15);
        addSfSymbol(subtitleStack, SUNSET_ICON_NAME, TODAY_SUNRISE_SET_SIZE);
        subtitleStack.addSpacer(5);
        let sunsetText = subtitleStack.addText(currentForecast.sunsetTime);
        sunsetText.font = Font.systemFont(10);
        sunsetText.textColor = TEXT_COLOR;
        subtitleStack.addSpacer();

        todayStack.addSpacer();

        let imageStack = todayStack.addStack();
        imageStack.layoutHorizontally();
        imageStack.centerAlignContent();
        imageStack.addSpacer();
        if (currentForecast.weatherIcon) {
            imageStack.addImage(currentForecast.weatherIcon);
        }
        imageStack.addSpacer(3);
        let descriptionTxt = imageStack.addText(currentForecast.weatherDescription);
        descriptionTxt.font = Font.systemFont(12);
        descriptionTxt.textColor = TEXT_COLOR;
        imageStack.addSpacer();

        todayStack.addSpacer();

        let firstDataStack = todayStack.addStack();
        firstDataStack.layoutHorizontally();
        firstDataStack.addSpacer();
        let firstDataText = firstDataStack.addText(currentForecast.firstDataRow);
        firstDataText.centerAlignText();
        firstDataText.font = Font.systemFont(12);
        firstDataText.textColor = TEXT_COLOR;
        firstDataStack.addSpacer();

        let secondDataStack = todayStack.addStack();
        secondDataStack.layoutHorizontally();
        secondDataStack.addSpacer();
        let secondDataText = secondDataStack.addText(currentForecast.secondDataRow);
        secondDataText.centerAlignText();
        secondDataText.font = Font.systemFont(12);
        secondDataText.textColor = TEXT_COLOR;
        secondDataStack.addSpacer();

    } else {
        let errorMessage = todayStack.addText('No data available!');
        errorMessage.font = Font.semiboldSystemFont(12);
        errorMessage.textColor = WARNING_COLOR;
    }
}

async function convertOpenweathermapTodayForecast(todayForecast) {
    let forecast = {};
    forecast.timestamp = formatTimestamp(todayForecast.current.dt, TIME_FORMAT);
    forecast.sunriseTime = formatTimestamp(todayForecast.current.sunrise, TIME_FORMAT);
    forecast.sunsetTime = formatTimestamp(todayForecast.current.sunset, TIME_FORMAT);
    forecast.weatherIcon = await getOpenweathermapIcon(todayForecast.current.weather[0].icon);
    forecast.weatherDescription = todayForecast.current.weather[0].description;
    forecast.firstDataRow = todayForecast.current.temp.toFixed(1) + '° (' + todayForecast.current.feels_like.toFixed(1) + '°)';
    forecast.secondDataRow = todayForecast.current.humidity + '% / ' + (todayForecast.current.wind_speed * 3.6).toFixed(1) + ' kmh';
    return forecast;
}

async function convertWundergroundTodayForecast(todayForecast) {
    let forecast = {};
    forecast.timestamp = formatISOTimestamp(todayForecast.station.observations[0].obsTimeLocal.replace(' ', 'T'), TIME_FORMAT); // local times are missing the T?
    forecast.sunriseTime = formatISOTimestamp(todayForecast.forecast.sunriseTimeLocal[0], TIME_FORMAT);
    forecast.sunsetTime = formatISOTimestamp(todayForecast.forecast.sunsetTimeLocal[0], TIME_FORMAT);
    forecast.weatherIcon = await getWundergroundIcon(todayForecast.forecast.daypart[0].iconCode[0] ? todayForecast.forecast.daypart[0].iconCode[0] : todayForecast.forecast.daypart[0].iconCode[1]);
    forecast.weatherDescription = todayForecast.forecast.daypart[0].wxPhraseLong[0] ? todayForecast.forecast.daypart[0].wxPhraseLong[0] : todayForecast.forecast.daypart[0].wxPhraseLong[1];
    forecast.firstDataRow = todayForecast.station.observations[0].metric.temp.toFixed(1) + '° (' + todayForecast.station.observations[0].metric.windChill.toFixed(1) + '°)';
    forecast.secondDataRow = todayForecast.station.observations[0].humidity + '% / ' + (todayForecast.station.observations[0].metric.windSpeed).toFixed(1) + ' kmh';
    return forecast;
}

async function addForecastStackTitle(currentStack, forecast, locationInformation) {
    let titleStack = currentStack.addStack();
    titleStack.layoutHorizontally();
    titleStack.centerAlignContent();
    titleStack.addSpacer();
    addSfSymbol(titleStack, locationInformation.isFixed ? FIXED_LOCATION_ICON_NAME : LOCATION_ICON_NAME, LOCATION_ICON_SIZE);
    titleStack.addSpacer(3);
    let title = titleStack.addText(locationInformation.city);
    title.font = Font.semiboldSystemFont(12);
    title.textColor = locationInformation.isCached ? WARNING_COLOR : TEXT_COLOR;
    title.textOpacity = 0.5;
    titleStack.addSpacer(3);
    let time = titleStack.addText('(' + ((forecast !== undefined) ? formatTimestamp(forecast.current.dt, TIME_FORMAT) : 'unbekannt') + ')');
    time.font = Font.semiboldSystemFont(12);
    time.textColor = (forecast !== undefined && forecast.isCached) ? WARNING_COLOR : TEXT_COLOR;
    time.textOpacity = 0.5;
    titleStack.addSpacer();
    currentStack.addSpacer();
}

// add a forecast row to the currentStack
async function addForecastStack(currentStack, forecast, convertForecastCallable, widgetFamily) {
    let forecastStack = currentStack.addStack();
    forecastStack.url = weatherUrl;
    forecastStack.layoutHorizontally();
    forecastStack.centerAlignContent();
    forecastStack.backgroundColor = STACK_BACKGROUND_COLOR;
    forecastStack.cornerRadius = 12;
    forecastStack.setPadding(7, 3, 7, 3);
    if (widgetFamily === 'large') {
        forecastStack.size = FORECAST_STACK_LARGE_SIZE;
    } else {
        forecastStack.size = FORECAST_STACK_MEDIUM_SIZE;
    }

    if (forecast !== null) {
        let counter = 0;
        for (let currentForecast of forecast) {
            if (counter++ > 0) {
                forecastStack.addSpacer(3);
            }

            currentForecast = await convertForecastCallable(currentForecast);

            // new stack
            let currentForecastStack = forecastStack.addStack();
            currentForecastStack.layoutVertically();
            currentForecastStack.centerAlignContent();

            // title row
            let titleStack = currentForecastStack.addStack();
            titleStack.layoutHorizontally();
            titleStack.addSpacer();
            let title = titleStack.addText(currentForecast.title);
            title.font = Font.semiboldSystemFont(10);
            title.textColor = TEXT_COLOR;
            title.textOpacity = 0.5;
            titleStack.addSpacer();

            // image row
            let imageStack = currentForecastStack.addStack();
            imageStack.layoutHorizontally();
            imageStack.addSpacer();
            imageStack.addImage(currentForecast.icon);
            imageStack.addSpacer();

            // data row
            let dataStack = currentForecastStack.addStack();
            dataStack.layoutHorizontally();
            dataStack.addSpacer();
            let data = dataStack.addText(currentForecast.data);
            data.font = Font.systemFont(10);
            data.textColor = TEXT_COLOR;
            dataStack.addSpacer();
        }
    } else {
        let errorMessage = forecastStack.addText('No data available!');
        errorMessage.font = Font.semiboldSystemFont(12);
        errorMessage.textColor = WARNING_COLOR;
    }
}

async function convertHourlyForecast(hourlyForecast) {
    let forecast = {};
    forecast.title = formatTimestamp(hourlyForecast.dt, HOUR_FORMAT) + 'h';
    forecast.icon = await getOpenweathermapIcon(hourlyForecast.weather[0].icon);
    forecast.data = Math.round(hourlyForecast.temp) + '°(' + Math.round(hourlyForecast.feels_like) + '°)';
    return forecast;
}

async function convertDailyForecast(dailyForecast) {
    let forecast = {};
    forecast.title = formatTimestamp(dailyForecast.dt, DAY_FORMAT);
    forecast.icon = await getOpenweathermapIcon(dailyForecast.weather[0].icon);
    forecast.data = Math.round(dailyForecast.temp.min) + '° / ' + Math.round(dailyForecast.temp.max) + '°';
    return forecast;
}

function addSfSymbol(currentStack, symbolName, imageSize) {
    let symbol = SFSymbol.named(symbolName);
    symbol.applyUltraLightWeight();
    let image = currentStack.addImage(symbol.image);
    image.imageSize = imageSize;
    image.tintColor = TINT_COLOR;
}

// data/network methods
///////////////////////

// return data from cache or from callable, depending on operating mode and internet connection
async function getWeatherData(weatherFileName, fetchDataCallable, locationInformation) {
    let weatherData;

    if (DEV_MODE) { // first load from cache, then from remote
        weatherData = readJsonFile(weatherFileName);
        if (weatherData === undefined) {
            weatherData = await fetchDataCallable(locationInformation);
            if (weatherData !== undefined) {
                writeJsonFile(weatherFileName, weatherData);
                console.log('using remote data for ' + weatherFileName);
            }
        }
    } else { // first load from remote, then from cache
        weatherData = await fetchDataCallable(locationInformation);
        if (weatherData !== undefined) {
            writeJsonFile(weatherFileName, weatherData);
        } else {
            weatherData = readJsonFile(weatherFileName);
        }
    }

    return weatherData;
}

// https://openweathermap.org/img/wn/
async function getOpenweathermapIcon(iconName) {
    return await getIcon(iconName + '.png', 'https://openweathermap.org/img/wn/' + iconName + '@2x.png');
}

// https://openweathermap.org/img/wn/
async function getWundergroundIcon(iconName) {
    return await getIcon(iconName + '.png', 'https://github.com/giroriub/scriptable-public/raw/main/weather/wundergroundIcons/' + iconName + '.png');
}

async function getIcon(iconFileName, iconUrl) {
    let icon;

    icon = readImage(iconFileName);
    if (icon === undefined) {
        try {
            icon = await new Request(iconUrl).loadImage();
            writeImage(iconFileName, icon);
            if (DEV_MODE) {
                console.log('using remote ' + iconFileName);
            }
        } catch (exception) {
            if (DEV_MODE) {
                console.error('getIcon exception: ' + exception);
            }
        }
    }

    return icon;
}

// https://openweathermap.org/api/one-call-api#multi
async function fetchOpenweathermapData(locationInformation) {
    let weatherData;
    const weatherURL = `https://api.openweathermap.org/data/2.5/onecall?lat=${locationInformation.latitude}&lon=${locationInformation.longitude}&exclude=minutely,alerts&units=${OPENWEATHERMAP_UNITS}&lang=${FORECAST_LANGUAGE_CODE}&appid=${OPENWEATHER_API_KEY}`;

    try {
        weatherData = await new Request(weatherURL).loadJSON();
    } catch (exception) {
        if (DEV_MODE) {
            console.error('openweathermap exception: ' + exception);
        }
    }

    return weatherData;
}

// https://docs.google.com/document/d/1KGb8bTVYRsNgljnNH67AMhckY8AQT2FVwZ9urj8SWBs/edit
// https://docs.google.com/document/d/1_Zte7-SdOjnzBttb1-Y9e0Wgl0_3tah9dSwXUyEA3-c/edit
async function fetchWundergroundData(locationInformation) {
    let weatherData = {};

    try {
        // get station data
        let weatherURL = 'https://api.weather.com/v2/pws/observations/current?stationId=' + WUNDERGROUND_STATION_ID + '&format=json&units=' + WUNDERGROUND_UNITS + '&apiKey=' + WUNDERGROUND_API_KEY;
        weatherData.station = await new Request(weatherURL).loadJSON();

        // get forecast data
        weatherURL = 'https://api.weather.com/v3/wx/forecast/daily/5day?geocode=' + locationInformation.latitude + ',' + locationInformation.longitude + '&format=json&units=' + WUNDERGROUND_UNITS + '&language=' + FORECAST_LANGUAGE_CODE + '&apiKey=' + WUNDERGROUND_API_KEY;
        weatherData.forecast = await new Request(weatherURL).loadJSON();

        return weatherData;
    } catch (exception) {
        if (DEV_MODE) {
            console.error('wunderground exception: ' + exception);
        }
        return undefined;
    }
}

// https://api.netatmo.com/oauth2/token && https://dev.netatmo.com/apidocumentation/weather#getstationsdata
async function fetchNetatmoData(locationInformation) {
    let netatmoData;

    try {
        // get access token
        let request = new Request('https://api.netatmo.com/oauth2/token');
        request.method = 'post';
        request.headers = {'Content-Type': 'application/x-www-form-urlencoded'};
        let bodyParameters = {
            'grant_type': 'password',
            'client_id': NETATMO_CLIENT_ID,
            'client_secret': NETATMO_CLIENT_SECRET,
            'username': NETATMO_USERNAME,
            'password': NETATMO_PASSWORD,
            'scope': NETATMO_SCOPE
        };
        request.body = createBody(bodyParameters);
        let response = await request.loadJSON();
        let accessToken = response['access_token'];
        if (DEV_MODE) {
            console.log('accessToken: ' + accessToken);
        }

        // get data
        request = new Request('https://api.netatmo.com/api/getstationsdata?device_id=' + encodeURIComponent(NETATMO_DEVICE_MAC_ID));
        request.headers = {'Authorization': 'Bearer ' + accessToken};
        response = await request.loadJSON();
        netatmoData = response.body.devices[0];
    } catch (exception) {
        if (DEV_MODE) {
            console.error('netatmo exception: ' + exception);
        }
    }

    return netatmoData;
}

// helper to convert array to htttp body string
function createBody(bodyParameters) {
    let parametersArray = [];

    for (let [key, value] of Object.entries(bodyParameters)) {
        parametersArray.push(key + '=' + encodeURIComponent(value));
    }

    return parametersArray.join('&');
}

// retrieve the location information (access to GPS may be needed)
async function getLocationInformation(givenLocation) {
    let locationInformation;
    const locationInformationFile = 'locationInformation.json';

    if (givenLocation !== undefined) { // location is given as widget parameter
        locationInformation = {};
        locationInformation.latitude = givenLocation.latitude;
        locationInformation.longitude = givenLocation.longitude;
        locationInformation.isFixed = true;
        filePrefix = locationInformation.latitude + '_' + locationInformation.longitude + '-'; // must be unique
    } else {
        try {
            locationInformation = await Location.current(); // get location from device
            locationInformation.isFixed = false;
        } catch (exception) {
            if (DEV_MODE) {
                console.error('location exception: ' + exception);
            }
        }
    }

    if (locationInformation !== undefined) {
        try {
            let reverseLocation = await Location.reverseGeocode(locationInformation.latitude, locationInformation.longitude); // get city from location
            locationInformation.city = reverseLocation[0].locality;
        } catch (exception) {
            locationInformation.city = 'Unbekannt';
            if (DEV_MODE) {
                console.error('reverseLocation exception: ' + exception);
            }
        }
        writeJsonFile(locationInformationFile, locationInformation);
        if (DEV_MODE) {
            console.log(locationInformation);
        }
    } else {
        locationInformation = readJsonFile(locationInformationFile);
    }

    return locationInformation;
}

async function getMeteoAlarmInfo(meteoalarmParameters) {
    let meteoAlarmInfo = {};
    const METEOALARM_URL = 'http://www.meteoalarm.eu/ATOM/' + meteoalarmParameters.countryCode + '.xml';

    try {
        meteoAlarmInfo = parseMeteoAlarmData(await new Request(METEOALARM_URL).loadString(), meteoalarmParameters.geocode);
    } catch (exception) {
        if (DEV_MODE) {
            console.error('meteoalarm exception: ' + exception);
        }
    }

    return meteoAlarmInfo;
}

// filemanager methods
//////////////////////

function readJsonFile(fileName) {
    let data;
    const pathName = fileManager.joinPath(cachePath, filePrefix + fileName);

    if (fileManager.fileExists(pathName)) {
        fileManager.downloadFileFromiCloud(pathName);
        data = JSON.parse(fileManager.readString(pathName));
        data.isCached = true;
        if (DEV_MODE) {
            console.log('using cached ' + fileName);
        }
    }

    return data;
}

function writeJsonFile(fileName, data) {
    const pathName = fileManager.joinPath(cachePath, filePrefix + fileName);

    fileManager.writeString(pathName, JSON.stringify(data));
}

function readImage(fileName) {
    let data;
    const pathName = fileManager.joinPath(cachePath, fileName);

    if (fileManager.fileExists(pathName)) {
        fileManager.downloadFileFromiCloud(pathName);
        data = fileManager.readImage(pathName);
        if (DEV_MODE) {
            console.log('using cached ' + fileName);
        }
    }

    return data;
}

function writeImage(fileName, data) {
    const pathName = fileManager.joinPath(cachePath, fileName);
    fileManager.writeImage(pathName, data);
}

// dateformat methods
/////////////////////

function formatTimestamp(timestamp, format) {
    let dateFormatter = new DateFormatter();
    dateFormatter.dateFormat = format;
    return dateFormatter.string(new Date(timestamp * 1000));
}

function formatISOTimestamp(timestamp, format) {
    let dateFormatter = new DateFormatter();
    dateFormatter.dateFormat = format;
    return dateFormatter.string(new Date(timestamp));
}

// xml methods
//////////////

/*
Example entry:
	<entry>
		<id>2.49.0.0.724.0.ES.201010063312.690803PRP1102211592</id>
		<updated>2020-10-10T07:33:12+01:00</updated>
		<published>2020-10-10T07:33:12+01:00</published>
		<author>
			<name>AGENCIA ESTATAL DE METEOROLOGIA</name>
			<uri>http://www.aemet.es/es/eltiempo/prediccion/avisos</uri>
		</author>
		<title> Rain Warning issued from for Spain - Prelitoral de Barcelona </title>
		<link hreflang="english" title="Prelitoral de Barcelona" href="http://meteoalarm.eu/auto/0/0/ES180.html"/>
		<link hreflang="english" title="Spain" rel="related" href="http://meteoalarm.eu/auto/0/0/ES.html"/>
		<link type="application/cap+xml" href="http://meteoalarm.eu/CAP/POLY/ES_10102020_176854106.cap.xml"/>
		<cap:status>Actual</cap:status>
		<cap:msgType>Update</cap:msgType>
		<cap:scope>Public</cap:scope>
		<cap:urgency>Immediate</cap:urgency>
		<cap:severity>Severe</cap:severity>
		<cap:certainty>Likely</cap:certainty>
		<cap:onset>2020-10-10T17:00:00+01:00</cap:onset>
		<cap:effective>2020-10-10T17:00:00+01:00</cap:effective>
		<cap:expires>2020-10-10T22:59:59+01:00</cap:expires>
		<cap:sent>2020-10-10T07:33:12+01:00</cap:sent>
		<cap:event>Severe Rain Warning</cap:event>
		<cap:areaDesc>Prelitoral de Barcelona</cap:areaDesc>
		<cap:geocode>
			<valueName>NUTS3</valueName>
			<value>ES511</value>
		</cap:geocode>
	</entry>
 */

function parseMeteoAlarmData(meteoAlarmData, geocode) {
    let meteoAlarmInfo = {};

    let highestSeverity = 'None';
    let currentSeverity = 'None';
    let currentUrl = '';

    const xmlParser = new XMLParser(meteoAlarmData);
    let currentValue = '';

    xmlParser.foundCharacters = (value) => {
        currentValue += value;
    }

    xmlParser.didStartElement = (name, attributes) => {
        currentValue = '';
        if ((name === 'link') && (attributes.rel === undefined) && (attributes.type === undefined)) {
            currentUrl = attributes.href;
        }
    }

    xmlParser.didEndElement = (name) => {
        if (name === 'cap:severity') {
            currentSeverity = currentValue;
        } else if (name === 'value') { // geocode.value (only value element so far. improvement: check for previous element == geocode)
            if (currentValue === geocode) {
                if ((highestSeverity === 'None') || (METEOALARM_SEVERITIES[currentSeverity].severity > METEOALARM_SEVERITIES[highestSeverity].severity)) {
                    highestSeverity = currentSeverity;
                    meteoAlarmInfo.severity = highestSeverity;
                    meteoAlarmInfo.url = currentUrl;
                }
            }
        }
    }

    xmlParser.parse();

    if (DEV_MODE) {
        console.log(meteoAlarmInfo);
    }

    return meteoAlarmInfo;
}
