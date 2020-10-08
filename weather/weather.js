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


// MAY be changed
/////////////////

// dev mode
const DEV_MODE = false; // true: run script in dev mode
const DEV_PREVIEW = 'large'; // widget size for dev mode
const DEV_MODE_WIDGET_PARAMETER = '{}'; // set desired widget parameters for dev mode
// const DEV_MODE_WIDGET_PARAMETER = '{"location": {"latitude": 37.7749, "longitude": -122.4194}, "smallWidgetStack": "netatmo"}'; // ex. San Francisco, ex. show netatmo instead of today in small widget

// forecast
const FORECAST_HOURS = 5; // recommended 4-6, depending on device (max. 48)
const FORECAST_DAYS = 5; // recommended 4-6, depending on device (max. 7)
const FORECAST_UNITS = 'metric' // metric for celsius and imperial for Fahrenheit
const FORECAST_LANGUAGE_CODE = 'de' // language for text output of openweathermap.org

// date formats
const DAY_FORMAT = 'E';
const HOUR_FORMAT = 'HH';
const TIME_FORMAT = 'HH.mm';

// application urls
const NETATMO_URL = 'netatmo://'; // opens netatmo app when netatmo-stack is 'clicked'
const WEATHER_URL = 'wettercomuniversal://'; // opens weather app when today-stack or forecast-stack is 'clicked'

// icons
const OUTDOOR_ICON_NAME = 'figure.walk.circle';
const INDOOR_ICON_NAME = 'house.circle';

// sizes (tweak depending on device)
const TOP_ROW_SIZE = new Size(0, 150);
const FORECAST_STACK_LARGE_SIZE = new Size(0, 85);
const FORECAST_STACK_MEDIUM_SIZE = new Size(0, 65);
const NETATMO_IMAGE_SIZE = new Size(35, 35);
const TODAY_IMAGE_SIZE = new Size(20, 20);

// modes https://docs.scriptable.app/device/#isusingdarkappearance is not supported in widgets, so you have to choose here
// normal mode
// const WIDGET_BACKGROUND = new Color('#d6d6d6'); // widget background
// const STACK_BACKGROUND = new Color('#ffffff'); // stack background
// const TEXT_COLOR = new Color('#000000'); // text
// const WARNING_COLOR = new Color('#de1515'); // warnings (ex. cache data used)
// const TINT_COLOR = new Color('#000000'); // make SFImage visible
// const SUNRISE_ICON_NAME = 'sunrise';
// const SUNSET_ICON_NAME = 'sunset';

// dark mode
const WIDGET_BACKGROUND = new Color('#000000'); // widget background
const STACK_BACKGROUND = new Color('#222222'); // stack background
const TEXT_COLOR = new Color('#ffffff'); // text
const WARNING_COLOR = new Color('#ff0000'); // warnings (ex. cache data used)
const TINT_COLOR = new Color('#ffffff'); // make SFImage visible
const SUNRISE_ICON_NAME = 'sunrise.fill';
const SUNSET_ICON_NAME = 'sunset.fill';

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

    let widget = new ListWidget();
    widget.backgroundColor = WIDGET_BACKGROUND;
    widget.setPadding(10, 10, 10, 10);

    let weatherForecast; // migh not be fetched, depending on stacks displayed

    if (widgetFamily === 'large' || widgetFamily === 'small') {

        let smallWidgetStack = (widgetParameter.smallWidgetStack !== undefined) ? widgetParameter.smallWidgetStack : 'today'; // default single small stack is today

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
                widget.url = WEATHER_URL;
            }
            weatherForecast = await getWeatherData('openweathermap.json', fetchOpenweathermapData, locationInformation); // get the forecast from https://openweathermap.org
            await addTodayStack(topRow, weatherForecast, locationInformation);
        }

        if (widgetFamily === 'large') {
            widget.addSpacer();
        }
    }

    if (widgetFamily === 'medium') {
        weatherForecast = await getWeatherData('openweathermap.json', fetchOpenweathermapData, locationInformation); // get the forecast from https://openweathermap.org
        let titleStack = widget.addStack();
        titleStack.backgroundColor = STACK_BACKGROUND;
        titleStack.cornerRadius = 12;
        titleStack.layoutHorizontally();
        titleStack.addSpacer();
        let time = (weatherForecast !== undefined) ? formatTimestamp(weatherForecast.current.dt, TIME_FORMAT) : 'unbekannt';
        let title = titleStack.addText(locationInformation.city + ', ' + time);
        title.font = Font.semiboldSystemFont(12);
        title.textColor = (weatherForecast !== undefined && weatherForecast.isCached) || locationInformation.isCached ? WARNING_COLOR : TEXT_COLOR;
        title.textOpacity = 0.5;
        titleStack.addSpacer();
        widget.addSpacer();
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
    netatmoStack.backgroundColor = STACK_BACKGROUND;
    netatmoStack.cornerRadius = 12;

    const netatmoData = await getWeatherData('netatmo.json', fetchNetatmoData, locationInformation); // get the data from https://dev.netatmo.com
    if (netatmoData !== undefined) {
        const dashboardData = netatmoData.dashboard_data;
        const modules = netatmoData.modules;

        let titleStack = netatmoStack.addStack();
        titleStack.layoutHorizontally();
        titleStack.addSpacer();
        let title = titleStack.addText(netatmoData.station_name + ', ' + formatTimestamp(dashboardData.time_utc, TIME_FORMAT));
        title.font = Font.semiboldSystemFont(12);
        title.textColor = netatmoData.isCached ? WARNING_COLOR : TEXT_COLOR;
        title.textOpacity = 0.5;
        titleStack.addSpacer();

        netatmoStack.addSpacer();

        let outdoorStack = netatmoStack.addStack();
        outdoorStack.layoutHorizontally();
        outdoorStack.centerAlignContent();
        let cloudSymbol = SFSymbol.named(OUTDOOR_ICON_NAME);
        cloudSymbol.applyUltraLightWeight();
        let outdoorIcon = outdoorStack.addImage(cloudSymbol.image);
        outdoorIcon.tintColor = TINT_COLOR;
        outdoorIcon.imageSize = NETATMO_IMAGE_SIZE;
        outdoorStack.addSpacer(10);

        // not all modules might respond => try to read data
        let outdoorTemperature = (modules[2].dashboard_data !== undefined) ? Math.round(modules[2].dashboard_data.Temperature) : '?';
        let outdoorHumidity = (modules[2].dashboard_data !== undefined) ? modules[2].dashboard_data.Humidity : '?';
        let windStrength = (modules[0].dashboard_data !== undefined) ? modules[0].dashboard_data.WindStrength : '?';
        let rain = (modules[1].dashboard_data !== undefined) ? Math.round(modules[1].dashboard_data.Rain) : '?';

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
        let houseSymbol = SFSymbol.named(INDOOR_ICON_NAME);
        houseSymbol.applyUltraLightWeight();
        let indoorIcon = indoorStack.addImage(houseSymbol.image);
        indoorIcon.tintColor = TINT_COLOR;
        indoorIcon.imageSize = NETATMO_IMAGE_SIZE;
        indoorStack.addSpacer(10);

        let indoorDataStack = indoorStack.addStack();
        indoorDataStack.layoutVertically();
        let indoorTemperatureTxt = indoorDataStack.addText(Math.round(dashboardData.Temperature) + '°');
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

async function addTodayStack(currentStack, weatherForecast, locationInformation) {
    // top row => today weather stack
    let todayStack = currentStack.addStack();
    todayStack.url = WEATHER_URL;
    todayStack.layoutVertically();
    todayStack.topAlignContent();
    todayStack.setPadding(7, 3, 7, 3);
    todayStack.backgroundColor = STACK_BACKGROUND;
    todayStack.cornerRadius = 12;

    if (weatherForecast !== undefined) {
        const currentForecast = weatherForecast.current;

        let titleStack = todayStack.addStack();
        titleStack.layoutHorizontally();
        titleStack.addSpacer();
        let title = titleStack.addText(locationInformation.city + ', ' + formatTimestamp(currentForecast.dt, TIME_FORMAT));
        title.font = Font.semiboldSystemFont(12);
        title.textColor = weatherForecast.isCached || locationInformation.isCached ? WARNING_COLOR : TEXT_COLOR;
        title.textOpacity = 0.5;
        titleStack.addSpacer();

        todayStack.addSpacer();

        let subtitleStack = todayStack.addStack();
        subtitleStack.layoutHorizontally();
        subtitleStack.centerAlignContent();
        subtitleStack.addSpacer();

        let sunriseSymbol = SFSymbol.named(SUNRISE_ICON_NAME);
        sunriseSymbol.applyUltraLightWeight();
        let sunriseIcon = subtitleStack.addImage(sunriseSymbol.image);
        sunriseIcon.imageSize = TODAY_IMAGE_SIZE;
        subtitleStack.addSpacer(5);
        let sunriseText = subtitleStack.addText(formatTimestamp(currentForecast.sunrise, TIME_FORMAT));
        sunriseText.font = Font.systemFont(10);
        sunriseText.textColor = TEXT_COLOR;

        subtitleStack.addSpacer(15);

        let sunsetSymbol = SFSymbol.named(SUNSET_ICON_NAME);
        sunsetSymbol.applyUltraLightWeight();
        let sunsetIcon = subtitleStack.addImage(sunsetSymbol.image);
        sunsetIcon.imageSize = TODAY_IMAGE_SIZE;
        subtitleStack.addSpacer(5);
        let sunsetText = subtitleStack.addText(formatTimestamp(currentForecast.sunset, TIME_FORMAT));
        sunsetText.font = Font.systemFont(10);
        sunsetText.textColor = TEXT_COLOR;

        subtitleStack.addSpacer();

        let imageStack = todayStack.addStack();
        imageStack.layoutHorizontally();
        imageStack.centerAlignContent();
        imageStack.addImage(await getWeatherIcon(currentForecast.weather[0].icon));
        let descriptionTxt = imageStack.addText(currentForecast.weather[0].description);
        descriptionTxt.font = Font.systemFont(12);
        descriptionTxt.textColor = TEXT_COLOR;

        let firstDataStack = todayStack.addStack();
        firstDataStack.layoutHorizontally();
        firstDataStack.addSpacer();
        let firstDataText = firstDataStack.addText(Math.round(currentForecast.temp) + '°(' + Math.round(currentForecast.feels_like) + '°) / ' + currentForecast.humidity + '%');
        firstDataText.centerAlignText();
        firstDataText.font = Font.systemFont(12);
        firstDataText.textColor = TEXT_COLOR;
        firstDataStack.addSpacer();

        let secondDataStack = todayStack.addStack();
        secondDataStack.layoutHorizontally();
        secondDataStack.addSpacer();
        let secondDataText = secondDataStack.addText(Math.round(currentForecast.wind_speed * 3.6) + ' kmh');
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

// add a forecast row to the currentStack
async function addForecastStack(currentStack, forecast, convertForecastCallable, widgetFamily) {
    let forecastStack = currentStack.addStack();
    forecastStack.url = WEATHER_URL;
    forecastStack.layoutHorizontally();
    forecastStack.centerAlignContent();
    forecastStack.backgroundColor = STACK_BACKGROUND;
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
    forecast.icon = await getWeatherIcon(hourlyForecast.weather[0].icon);
    forecast.data = Math.round(hourlyForecast.temp) + '°(' + Math.round(hourlyForecast.feels_like) + '°)';
    return forecast;
}

async function convertDailyForecast(dailyForecast) {
    let forecast = {};
    forecast.title = formatTimestamp(dailyForecast.dt, DAY_FORMAT);
    forecast.icon = await getWeatherIcon(dailyForecast.weather[0].icon);
    forecast.data = Math.round(dailyForecast.temp.min) + '° / ' + Math.round(dailyForecast.temp.max) + '°';
    return forecast;
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
async function getWeatherIcon(iconName) {
    let icon;
    let iconFileName = iconName + '.png';

    icon = readImage(iconFileName);
    if (icon === undefined) {
        icon = await new Request('https://openweathermap.org/img/wn/' + iconName + '@2x.png').loadImage();
        writeImage(iconFileName, icon);
        if (DEV_MODE) {
            console.log('using remote ' + iconFileName);
        }
    }

    return icon;
}

// https://openweathermap.org/api/one-call-api#multi
async function fetchOpenweathermapData(locationInformation) {
    let weatherData;
    const weatherURL = `https://api.openweathermap.org/data/2.5/onecall?lat=${locationInformation.latitude}&lon=${locationInformation.longitude}&exclude=minutely,alerts&units=${FORECAST_UNITS}&lang=${FORECAST_LANGUAGE_CODE}&appid=${OPENWEATHER_API_KEY}`;

    try {
        weatherData = await new Request(weatherURL).loadJSON();
    } catch (exception) {
        if (DEV_MODE) {
            console.error('forecast exception: ' + exception);
        }
    }

    return weatherData;
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
        filePrefix = locationInformation.latitude + locationInformation.longitude + '-'; // must be unique
    } else {
        try {
            locationInformation = await Location.current(); // get location from device
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
