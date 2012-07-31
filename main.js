var artistCache = {};
var events = null;
var toload = null;
// needed cause may be more than one artist in event
var currentArtist = null;

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

function onArtistsLoaded(data, textStatus, xhr)
{
    if (!('topartists' in data) || !('artist' in data.topartists))
    {
        loadEvents(toload.pop(), 1);
        return;
    }
    var artists = data.topartists.artist;
    var cache = artistCache[data.topartists.artist.user] = [];
    if (artists.hasOwnProperty('length'))
    {
        for (var i in artists)
        {
            var artist = artists[i];
            cache.push(artist.name);
        }
    }
    else
    {
        cache.push(artists);
    }
    events = {};
    toload = cache.slice();
    loadEvents(toload.pop(), 1);
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
        error: onAjaxError//TODO
    });
}

function onEventsLoaded(data, textStatus, xhr)
{
    if (!('events' in data) || !('event' in data.events))
    {
        if (toload.length != 0)
        {
            loadEvents(toload.pop(), 1);
        }
        else
        {
            showEvents();
            $('#startSearch').removeAttr('disabled');
        }
        return;
    }
    var events = data.events.event;
    var cache = events[currentArtist] = [];
    console.log(currentArtist + ':' + events.length);
    if (events.hasOwnProperty('length'))
    {
        for(var i in events)
        {
            var event = events[i];
            cache.push(event);
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

function onAjaxError(xhr, textStatus, errorThrown)
{
    alert("Sorry, couldn't load artist list");
}

function onStartSearch()
{
    var user = $('#username').val();
    if (user == null || user === '')
    {
        alert('Please enter user name');
        return;
    }
    var periodStart = $('#periodStart').val();
    if (periodStart == null || periodStart === '')
    {
        alert('Please enter start date of period');
        return;
    }
    periodStart = new Date(periodStart);
    if (!(user in artistCache))
    {
        loadArtists(user);
        $('#startSearch').attr('disabled', 'disabled');
    }
    else
    {
        showEvents();
    }
}

function showEvents()
{
    var $table = $('table')
    for(var artist in events)
    {
        $table.append('<tr><td class="divider" colspan=3>' + artist + '</td></tr>');
        for(var i in events[artist])
        {
            var event = events[artist][i];
            $('tr')
                .append('<td>' + event.startDate + '</td>')
                .append('<td>' + event.venue.location.city + '</td>')
                .append('<td>' + event.venue.title + '</td>');
            $table.append($tr);
        }
    }
    $('body').append($table);
}

$(document).ready(function(){
    $('#periodStart').datepicker({minDate: new Date()});
    $('#periodEnd').datepicker({minDate: new Date()});
    $('#startSearch').click(onStartSearch);
});
