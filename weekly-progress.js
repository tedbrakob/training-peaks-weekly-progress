var checkNavLoaded = setInterval(function() {
    let tries = 0;
    let loaded = document.getElementsByClassName('appHeaderMainNavigation').length;

    if (loaded) {
        clearInterval(checkNavLoaded);

        attachNavClickHandler();
        if ( document.getElementsByClassName('appHeaderMainNavigation calendar').length ) {
            checkCalendarLoaded();
        }
    } else {
        tries++;
        if (tries > 200) {
            clearInterval(checkNavLoaded);
        }
    }
}, 50);

function attachNavClickHandler () {
    let calendarNavButton = document.getElementsByClassName('appHeaderMainNavigationButtons calendar')[0];
    calendarNavButton.addEventListener('click', checkCalendarLoaded);
}

function checkCalendarLoaded () {
    var calendarLoadedChecker = setInterval(function() {
        let tries = 0;
        let loaded = document.querySelectorAll('.cf.daysContainer.thisWeek .dayWidth.dayContainer.day .addWorkoutWrapper').length;

        if (loaded) {
            clearInterval(calendarLoadedChecker);
            setTimeout(main, 1); //TODO: Find a less hacky way to wait until workouts are loaded
        } else {
            tries++;
            if (tries > 200) {
                clearInterval(calendarLoadedChecker);
            }
        }
    }, 50);
}

function main () {
    const thisWeek = document.getElementsByClassName('thisWeek')[0];
    const sportMetrics = initializeMetrics(thisWeek);

    for (const [sport, metrics] of Object.entries(sportMetrics)) {
        populatePlannedMetrics(sport, metrics, thisWeek);
    }

    addNetDistanceElements(sportMetrics, thisWeek);
}

class Duration {
    constructor(hours, minutes, seconds) {
        this.hours = hours;
        this.minutes = minutes;
        this.seconds = seconds;
    }

    toString () {
        return `${this.hours}:${this.getMinutesString()}`;
    }

    getMinutesString () {
        return String(this.minutes).padStart(2, '0')
    }

    getTotalSeconds () {
        let total = this.seconds;
        total += this.minutes * 60;
        total += this.hours * 60 * 60;

        return total;
    }

    static createFromString (string) {
        const components = string.split(':');

        let hours = components[0] ? Number(components[0]) : 0;
        let minutes = components[1] ? Number(components[1]) : 0;
        let seconds = components[2] ? Number(components[2]) : 0;

        return new Duration(hours, minutes, seconds);
    }

    static sum (a, b) {
        let hours = a.hours + b.hours;
        let minutes = a.minutes + b.minutes;
        let seconds = a.seconds + b.seconds;

        if (seconds >= 60) {
            minutes += Math.floor(seconds/60);
            seconds %= 60;
        }

        if (minutes >= 60) {
            hours += Math.floor(seconds/60);
            minutes %= 60;
        }

        return new Duration(hours, minutes, seconds)
    }

    static diff (a, b) {
        let hours = a.hours - b.hours;
        let minutes = a.minutes - b.minutes;
        let seconds = a.seconds - b.seconds;

        if (seconds < 0) {
            minutes++;
            seconds+=60;
        }

        if (minutes < 0) {
            hours++;
            minutes+=60;
        }

        return new Duration(hours, minutes, seconds)
    }
};

const metricSelectors = {
    duration: {
        summarySelector: ".duration",
        completedWorkoutSelector: ".totalTimePlanned",
        skippedWorkoutSelector: ".duration",
    },
    distance: {
        summarySelector: ".distance",
        completedWorkoutSelector: ".distancePlanned",
        skippedWorkoutSelector: ".distance",
    },
    tss: {
        summarySelector: ".tss",
        completedWorkoutSelector: ".tssPlanned",
        skippedWorkoutSelector: ".tss",
    }
}

function populatePlannedMetrics (sport, metrics, thisWeek) {
    for (const metric of Object.keys(metrics)) {

        let total = 0;

        if ( metric === "duration" ) {
            total = getPlannedValueFromSkippedWorkouts(sport, metric, thisWeek);
            total = Duration.sum(total, getPlannedValueFromCompletedWorkouts(sport, metric, thisWeek));
        } else {
            total += getPlannedValueFromSkippedWorkouts(sport, metric, thisWeek);
            total += getPlannedValueFromCompletedWorkouts(sport, metric, thisWeek);
        }
    
        metrics[metric].planned = total;
    }
}

function getPlannedValueFromSkippedWorkouts (sport, metric, thisWeek) {

    let total = 0;
    if ( metric === "duration" ) {
        total = new Duration(0, 0, 0);
    }

    let metricSelector = metricSelectors[metric].skippedWorkoutSelector;
    let selector = '';
    
    if( sport === "total" ) {
        selector = `.isSkipped ${metricSelector}`;
    } else {
        selector = `.${sport} .isSkipped ${metricSelector}`;
    }
    
    const skippedWorkouts = thisWeek.querySelectorAll(selector);

    for (workout of skippedWorkouts) {
        let workoutPlanned = workout.childNodes[0].childNodes[0].data;

        if ( metric === "duration" ) {
            workoutPlanned = Duration.createFromString(workoutPlanned);
            total = Duration.sum(total, workoutPlanned);
        } else {
            workoutPlanned = Number(workoutPlanned);
            total += workoutPlanned;
        }
    }

    return total;
}

function getPlannedValueFromCompletedWorkouts (sport, metric, thisWeek) {
    let total = 0;
    if ( metric === "duration" ) {
        total = new Duration(0, 0, 0);
    }

    let metricSelector = metricSelectors[metric].completedWorkoutSelector;
    let selector = '';
    
    if( sport === "total" ) {
        selector = `.complete ${metricSelector}`;
    } else {
        selector = `.${sport} .complete ${metricSelector}`;
    }

    const completedWorkouts = thisWeek.querySelectorAll(selector);

    for (workout of completedWorkouts) {
        let workoutPlanned = workout.childNodes[1].data;

        if ( metric === "duration" ) {
            workoutPlanned = Duration.createFromString(workoutPlanned);
            total = Duration.sum(total, workoutPlanned);
        } else {
            workoutPlanned = Number(workoutPlanned);
            total += workoutPlanned;
        }
    }
    return total;
}

function initializeMetrics (thisWeek) {
    const metrics = {};

    const graphContainers = thisWeek.querySelectorAll('.weekSummaryBarGraphItem');
    
    for (const container of graphContainers) {
        const sport = container.classList[1];
        const metric = container.classList[2];

        let completed = container.querySelectorAll(".weekSummaryValueCompleted.total")[0].innerText;
        completed = completed.replace(/[^\d.-:]/g, '');

        if ( metric === 'duration') {
            completed = Duration.createFromString(completed);
        } else {
            completed = Number(completed);
        }

        if ( !metrics[sport] ) {
            metrics[sport] = {};
        }
        metrics[sport][metric] = {
            planned: 0,
            completed: completed,
        };
    }

    return metrics;
}

function addNetDistanceElements (sportMetrics, thisWeek) {    
    for (const [sport, metrics] of Object.entries(sportMetrics)) {
        for (const [metric, values] of Object.entries(metrics)) {

            let net;

            if ( metric === "duration" ) {
                net = Duration.diff(values.completed, values.planned);
            } else {
                net = values.completed - values.planned;
                if ( metric !== "tss" ) {
                    net = net.toFixed(1)
                }
            }

            const netDistanceElement = createDifferenceElement(sport, metric, net, thisWeek);
            const selector = metricSelectors[metric].summarySelector;

            let container = thisWeek.querySelectorAll(`.${sport}${selector} .weekSummaryBarGraphValueContain`)[0];
            container.style.width = "auto";

            container.appendChild(netDistanceElement);
        }
    }
}

function createDifferenceElement (sport, metric, net, thisWeek) {
    const selector = metricSelectors[metric].summarySelector;
    let newElementId = `training-peaks-weekly-progress-difference-${sport}-${metric}`;

    let newElement = document.getElementById(newElementId);
    if ( !newElement ) {
        let metricCompleted = thisWeek.querySelectorAll(`.${sport}${selector} .weekSummaryValueCompleted.total`)[0];
        newElement = metricCompleted.cloneNode(true);
        newElement.id = newElementId;
    }

    if ( metric === 'duration' ) {
        netSeconds = net.getTotalSeconds();
        if ( netSeconds > 0 ) {
            newElement.style.color = "green";
            net = "+"+net;
        } else if ( netSeconds < 0) {
            newElement.style.color = "red";
        } else {
            newElement.style.color = "gray";
        }
    } else {
        if ( net > 0 ) {
            newElement.style.color = "green";
            net = "+"+net;
        } else if ( net < 0) {
            newElement.style.color = "red";
        } else {
            newElement.style.color = "gray";
        }
    }

    newElement.innerText = net;
    newElement.title = `Difference between completed and planned ${metric} of past workouts`;

    return newElement;
}