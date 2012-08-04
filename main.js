function lastfm(params)
{
    var success = params.success || function(){};
    var error = params.error || function(){};
    delete params.success;
    delete params.error;
    $.ajax({
        url: 'http://ws.audioscrobbler.com/2.0/',
        data: $.extend(params, {
            api_key: 'b25b959554ed76058ac220b7b2e0a026',
            format: 'json',
        }),
        dataType: 'jsonp',
        crossDomain: true,
        success: success,
        error: error
    });
}

function parseArtists(data)
{
    var result = [];
    if (!('artist' in data.topartists))
        return result;
    if (!$.isArray(data.topartists.artist))
    {
        result.push(data.topartists.artist.name);
    }
    else
    {
        var artists = data.topartists.artist;
        for (var i in artists)
        {
            result.push(artists[i].name);
        }
    }
    return result;
}

function parseEvents(data, artist)
{
    var result = [];
    if (!('event' in data.events))
        return result;
    var events = $.isArray(data.events.event)
        ? data.events.event
        : [data.events.event];
    for(var i in events)
    {
        var event = events[i];
        if (event.cancelled !== "1")
        {
            var date = new Date(event.startDate);
            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);
            result.push({
                artist: artist,
                title: event.title,
                date: date,
                url: event.url,
                city: event.venue.location.city,
                country: event.venue.location.country,
                venue: event.venue.name
            });
        }
    }
    return result;
}

function filterEvents(events, filters)
{
    var result = [];
    for (var i in events)
    {
        var ev = events[i];
        var time = ev.date.getTime();
        if (time >= filters.start && time <= filters.end)
        {
            if (filters.cities || filters.countries)
            {
                if (filters.cities && ev.city
                    && filters.cities.indexOf(ev.city.toLowerCase()) != -1)
                {
                    result.push(ev);
                }
                else if (filters.countries
                    && filters.countries.indexOf(ev.country.toLowerCase()) != -1)
                {
                    result.push(ev);
                }
            }
            else
            {
                result.push(ev);
            }
        }
    }
    return result;
}

function compareEvents(a, b)
{
    return a.date.getTime() - b.date.getTime();
}

function sortEvents(events, order)
{
    if (order == 'asc')
        return events.sort(compareEvents);
    return event.sort(compareEvents).reverse();
}

function onAjaxError(xhr, textStatus, errorThrown)
{
    alert("Sorry, couldn't load artist list");
    $('#startSearch').removeAttr('disabled');
    $('#progressbar-container').hide()
        .find('#progressbar-text').text('');
}

var user = null;

function onStartSearch()
{
    user = $('#username').val();
    var artists = $('#artists').val();
    if (!user && !artists)
    {
        alert('Please enter user name or artists');
        return;
    }
    if (!$('#periodStart').datepicker('getDate'))
    {
        alert('Please enter start date of period');
        return;
    }
    $('#startSearch').attr('disabled', 'disabled');
    $('#noevents').remove();
    if (artists)
    {
        onArtistsReady(artists.split(','));
    }
    else
    {
        $('#progressbar-container')
            .show()
            .find('#progressbar')
            .progressbar({value: 0});
        $('#progressbar-text').text('Loading artists');
        var pagesToLoad = 1;
        artists = [];
        var onLoaded = function(data, status, xhr)
        {
            var result = parseArtists(data);
            artists.push.apply(artists, result);
            if ('@attr' in data.topartists)
            {
                var page = parseInt(data.topartists['@attr'].page);
                var totalPages = parseInt(data.topartists['@attr'].totalPages);
            }
            else
            {
                var page = parseInt(data.topartists.page);
                var totalPages = parseInt(data.topartists.totalPages);
            }
            if (page < totalPages && page < pagesToLoad)
            {
                $('#progressbar').progressbar('option', 'value',
                    (totalPages - page) / totalPages * 100);
                lastfm({
                    method: 'user.gettopartists',
                    user: user,
                    page: page + 1,
                    success: onLoaded,
                    error: onAjaxError
                });
            }
            else
            {
                onArtistsReady(artists);
            }
        };
        lastfm({
            method: 'user.gettopartists',
            user: user,
            page: 1,
            success: onLoaded,
            error: onAjaxError
        });
    }
}

function onArtistsReady(artists)
{
    $('#progressbar').progressbar({value: 0});
    if (artists.length == 0)
    {
        $('#progressbar-container').hide()
            .find('#progressbar-text').text('');
        alert('Artists not found');
        return;
    }
    artists.total = artists.length;
    var artist = artists.pop();
    var events = [];
    var loadNext = function()
    {
        if (artists.length != 0)
        {
            // -1 because one was already loaded at first step
            $('#progressbar').progressbar('option', 'value',
                (artists.total - artists.length - 1) / artists.total * 100);
            artist = artists.pop();
            lastfm({
                method: 'artist.getevents',
                artist: artist,
                page: 1,
                success: onLoaded,
                error: onError
            });
        }
        else
        {
            onEventsReady(events);
        }
    };
    var onLoaded = function(data)
    {
        var result = parseEvents(data, artist);
        events.push.apply(events, result);
        $('#progressbar-text').text(artist);
        if ('@attr' in data.events)
        {
            var page = parseInt(data.events['@attr'].page);
            var totalPages = parseInt(data.events['@attr'].totalPages);
        }
        else
        {
            var page = parseInt(data.events.page);
            var totalPages = parseInt(data.events.totalPages);
        }
        if (page < totalPages)
        {
            lastfm({
                method: 'artist.getevents',
                artist: artist,
                page: page + 1,
                success: onLoaded,
                error: onError
            });
            return;
        }
        loadNext();
    };
    var onError = function(xhr, status, error)
    {
        $('#progressbar-text').text(artist + ': failed');
        loadNext();
    };
    $('#progressbar-container')
        .show()
        .find('#progressbar')
        .progressbar({value: 0});
    $('#progressbar-text').text(artist);
    lastfm({
        method: 'artist.getevents',
        artist: artist,
        page: 1,
        success: onLoaded,
        error: onError
    });
}

function onEventsReady(events)
{
    var end = $('#periodEnd').datepicker('getDate') || new Date(2099, 1, 1);
    var filters = {
        start: $('#periodStart').datepicker('getDate'),
        end: end,
        order: true
    };
    var cities = $('#cities').val();
    if (cities) filters.cities = cities.toLowerCase().split(',');
    var countries = $('#countries').val();
    if (countries) filters.countries = countries.toLowerCase().split(',');
    events = filterEvents(events, filters);
    showEvents(sortEvents(events, 'asc'));
    $('#startSearch').attr('disabled', null);
    $('#progressbar-container').hide()
        .find('#progressbar-text').text('');
}

function showEvents(events)
{
    $('#results').remove();
    if (events.length == 0)
    {
        $('body').append($('<div>', {id: 'noevents', text: 'No events found'}));
        return;
    }
    var $table = $('<table>', {id: 'results'});
    var previousDate = 0;
    for (var i in events)
    {
        var event = events[i];
        if (event.date != previousDate)
        {
            previousDate = event.date.getTime();
            $table.append(
                $('<tr>').append(
                    $('<td>', {
                        class: 'divider',
                        colspan: 4,
                        text: event.date.toLocaleDateString()
                    })
                )
            );
        }
        var $tr = $('<tr>')
            .append($('<td>').append(
                $('<a>', {
                    href: 'http://last.fm/music/'
                        + encodeURIComponent(event.artist) + '/+events',
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
            .append($('<td>', {text:
                event.city ? event.city + ', ' + event.country
                           : event.country}))
            .append($('<td>', {text: event.venue}));
        $table.append($tr);
    }
    $('body').append($table);
}

$(document).ready(function(){
    var now = new Date();
    $('#periodStart').val(now.toLocaleDateString())
        .datepicker({
        minDate: now,
        defaultDate: now,
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
    $('#periodEnd').datepicker({minDate: now});
    $('#startSearch').click(onStartSearch);
});
