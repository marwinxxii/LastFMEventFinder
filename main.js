var artistCache = {};
var eventCache = null;
var toload = null;
// needed cause may be more than one artist in event
var currentArtist = null;
var periodStart = null, periodEnd = new Date(2099, 1, 1);

function loadArtists(user)
{
    $.ajax({
        url: 'http://ws.audioscrobbler.com/2.0/',
        data: {
            method: 'user.gettopartists',
            user: user,
            api_key: 'b25b959554ed76058ac220b7b2e0a026',
            format: 'json'
        },
        dataType: 'jsonp',
        crossDomain: true,
        success: onArtistsLoaded,
        error: onAjaxError
    });
}

function loadEvents(artist, page)
{
    currentArtist = artist;
    $.ajax({
        url: 'http://ws.audioscrobbler.com/2.0/',
        data: {
            method: 'artist.getevents',
            artist: artist,
            api_key: 'b25b959554ed76058ac220b7b2e0a026',
            format: 'json',
            page: page
        },
        dataType: 'jsonp',
        crossDomain: true,
        success: onEventsLoaded,
        //error: onAjaxError//TODO
    });
}

function onArtistsLoaded(data, textStatus, xhr)
{
    if (!('artist' in data.topartists))
        return;
    if (!$.isArray(data.topartists.artist))
    {
        data.topartists.artist = [data.topartists.artist];
    }
    var artists = data.topartists.artist;
    var cache = artistCache[data.topartists.user] = [];
    for (var i in artists)
    {
        var artist = artists[i];
        cache.push(artist.name);
    }
    eventCache = [];
    toload = cache.slice();
    loadEvents(toload.pop(), 1);
}

function onAjaxError(xhr, textStatus, errorThrown)
{
    alert("Sorry, couldn't load artist list");
    $('#startSearch').removeAttr('disabled');
}

function onEventsLoaded(data, textStatus, xhr)
{
    if ('event' in data.events)
    {
        if (!$.isArray(data.events.event))
        {
            data.events.event = [data.events.event];
        }
        var events = data.events.event;
        for(var i in events)
        {
            var event = events[i];
            if (event.cancelled !== "1")
            {
                eventCache.push({
                    artist: currentArtist,
                    title: event.title,
                    date: new Date(event.startDate),
                    url: event.url,
                    location: event.venue.location.city + ', '
                        + event.venue.location.country,
                    venue: event.venue.name
                });
            }
        }
    }
    if (data.page < data.totalPages)
    {
        loadEvents(currentArtist, parseInt(data.page) + 1);
    }
    else if (toload.length != 0)
    {
        loadEvents(toload.pop(), 1);
    }
    else
    {
        showEvents();
        $('#startSearch').removeAttr('disabled');
    }
}

function onStartSearch()
{
    var user = $('#username').val();
    if (user == null || user === '')
    {
        alert('Please enter user name');
        return;
    }
    periodStart = $('#periodStart').val();
    if (periodStart == null || periodStart === '')
    {
        alert('Please enter start date of period');
        return;
    }
    periodStart = new Date(periodStart);
    var end = $('#periodEnd').val();
    if (end != null && end !== '')
    {
        periodEnd = new Date(end);
    }
    //if (!(user in artistCache))
    if (eventCache == null)
    {
        loadArtists(user);
        $('#startSearch').attr('disabled', 'disabled');
    }
    else
    {
        showEvents();
    }
}

function groupEvents()
{
    var groups = {};
    var start = periodStart.getTime();
    var end = periodEnd.getTime();
    for(var i in eventCache)
    {
        var ev = eventCache[i];
        var date = ev.date;
        var time = date.getTime();
        if (time >= start && time <= end)
        {
            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);
            date = date.toLocaleDateString();
            if (!(date in groups))
                groups[date] = [];
            groups[date].push(ev);
        }
    }
    var ordered = [];
    for(var d in groups)
    {
        ordered.push(d);
    }
    ordered = ordered.sort();
    return {groups: groups, order: ordered};
}

function showEvents()
{
    $('#results').remove();
    var grouped = groupEvents();
    var $table = $('<table>', {id: 'results'});
    for(var date in grouped.order)
    {
        date = grouped.order[date];
        $table.append(
            $('<tr>').append(
                $('<td>', {
                    class: 'divider',
                    colspan: 4,
                    text: date
                })
            )
        );
        for(var i in grouped.groups[date])
        {
            var event = grouped.groups[date][i];
            var $tr = $('<tr>')
                .append($('<td>').append(
                    $('<a>', {
                        href: 'http://last.fm/music/' + event.artist + '/+events',
                        text: event.artist,
                        target: '_blank',
                        title: 'Go to artist events'
                    })
                ))
                .append($('<td>').append(
                    $('<a>', {
                        href: event.url,
                        text: event.title,
                        target:' _blank',
                        title: 'Go to event page'
                    })
                ))
                .append($('<td>', {text: event.location}))
                .append($('<td>', {text: event.venue}));
            $table.append($tr);
        }
    }
    $('body').append($table);
}

$(document).ready(function(){
    $('#periodStart').datepicker({
        minDate: new Date(),
        onSelect: function(dateText, inst) {
            var $endPicker = $('#periodEnd');
            var newDate = new Date(dateText);
            var endDate = $endPicker.datepicker('getDate');
            if (endDate != null && newDate.getTime() > endDate.getTime())
            {
                $endPicker.datepicker('setDate', null);
            }
            $endPicker.datepicker('option', 'minDate', newDate);
        }
    });
    $('#periodEnd').datepicker({minDate: new Date()});
    $('#startSearch').click(onStartSearch);
});
