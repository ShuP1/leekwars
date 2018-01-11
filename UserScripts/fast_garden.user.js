// ==UserScript==
// @name          [Leek Wars] Fast Garden
// @namespace     https://github.com/jonathanjdev/leek-wars-userscripts
// @version       1.6
// @description   Permet de lancer plus rapidement ses combats
// @author        jojo123, Amal, sheychen
// @projectPage   https://github.com/jonathanjdev/leek-wars-userscripts
// @downloadURL   https://github.com/sheychen290/leekwars/raw/master/Us  erScripts/fast_garden.user.js
// @updateURL     https://github.com/sheychen290/leekwars/raw/master/Us  erScripts/fast_garden.user.js 
// @match         *://*.leekwars.com/*
// @grant         none
// @run-at        document-start
// ==/UserScript==

/**
 * Fast Garden
 */
USERSCRIPT_LW_FAST_GARDEN = {
	version: 1.6
};

if (typeof unsafeWindow !== 'undefined')
	unsafeWindow.USERSCRIPT_LW_FAST_GARDEN = USERSCRIPT_LW_FAST_GARDEN;

/**
 * Fast Garden - Attributes
 */
USERSCRIPT_LW_FAST_GARDEN.loading = false;
USERSCRIPT_LW_FAST_GARDEN.request_counter = 0;
USERSCRIPT_LW_FAST_GARDEN.fight_history = [];
USERSCRIPT_LW_FAST_GARDEN.callbacks = {
	'start_fight': [],
	'fight_result': []
};

/**
 * Fast Garden - Init
 */
USERSCRIPT_LW_FAST_GARDEN.init = (function()
{
	var _this = this;

	// Event : garden-solo
	$('body').on('mouseup', '#garden-solo .opponents .leek', function()
	{
		$(this).unbind("click");
	});
	$('body').on('click', '#garden-solo .opponents .leek', function(e)
	{
		e.stopPropagation();

		// Submit Fight
		var myleek_id = localStorage["garden/leek"];
		_this.submitFight("solo", {
			leek_id: myleek_id,
			target_id: $(this).attr('leek')
		}, function()
		{
			// Counter
			LW.pages.garden.scope.garden.fights -= 1;

			// Update interface
			if (LW.pages.garden.scope.garden.fights >= 0)
			{
				$('#farmer-fights').text(parseInt($('#farmer-fights').text()) - 1);
				$('#remaining-fights .on span').text(parseInt($('#farmer-fights').text()));
			}
		});
	});

	// Event : garden-farmer
	$('body').on('mouseup', '#garden-farmer .opponents .farmer', function()
	{
		$(this).unbind("click");
	});
	$('body').on('click', '#garden-farmer .opponents .farmer', function(e)
	{
		e.stopPropagation();

		// Submit Fight
		_this.submitFight("farmer", {
			target_id: $(this).attr('id')
		}, function()
		{
			// Counter
			LW.pages.garden.scope.garden.fights -= 1;

			// Update interface
			if (LW.pages.garden.scope.garden.fights >= 0)
			{
				$('#farmer-fights').text(parseInt($('#farmer-fights').text()) - 1);
				$('#remaining-fights .on span').text(parseInt($('#farmer-fights').text()));
			}
		});
	});

	// Event : garden-team
	$('body').on('mouseup', '#garden-team .opponents .compo', function()
	{
		$(this).unbind("click");
	});
	$('body').on('click', '#garden-team .opponents .compo', function(e)
	{
		e.stopPropagation();

		// Submit Fight
		var myCompo_id = localStorage["garden/compo"];
		_this.submitFight("team", {
			composition_id: myCompo_id,
			target_id: $(this).attr('compo')
		}, function()
		{
			// Counter
			var compo_fights = 0;
			for (i in LW.pages.garden.scope.garden.my_compositions)
			{
				if (LW.pages.garden.scope.garden.my_compositions[i].id == myCompo_id)
				{
					LW.pages.garden.scope.garden.my_compositions[i].fights -= 1;
					compo_fights = LW.pages.garden.scope.garden.my_compositions[i].fights;
				}
			}

			// Update interface
			if (compo_fights >= 0)
			{
				$('#my-compos .compo[compo='+myCompo_id+']').parents('.compo-wrapper').children('.fights').html($('#my-compos .compo[compo='+myCompo_id+']').parents('.compo-wrapper').children('.fights').html().replace($('#my-compos .compo[compo='+myCompo_id+']').parents('.compo-wrapper').children('.fights').text().replace(/\s/g, ""), compo_fights));
			}
		});
	});

	// Event : change leek
	$('body').on('click', '#garden-solo .myleek', function()
	{
		// Show history
		var myleek_id = $(this).attr('leek');
		$('#garden-solo .fight-history').hide();
		$('#garden-solo .fight-history[element_id='+myleek_id+']').show();
	});

	// Event : change compo
	$('body').on('click', '#my-compos .compo', function()
	{
		// Show history
		var myCompo_id = $(this).attr('compo');
		$('#garden-team .fight-history').hide();
		$('#garden-team .fight-history[element_id='+myCompo_id+']').show();
	});

	// Event : pageload
	LW.on('pageload', function()
	{
		if (LW.currentPage == "garden")
		{
			// Restore history
			for (var i = 0; i < _this.fight_history.length; i++)
			{
				var history = _this.fight_history[i];
				$('#garden-'+history.type).append('<div class="fight-history" type="'+history.type+'" element_id="'+history.id+'"></div>');
				if (!(history.type == "solo" && history.id == localStorage["garden/leek"]) && !(history.type == "farmer") && !(history.type == "team" && history.id == localStorage["garden/compo"]))
					$('#garden-'+history.type+' .fight-history[element_id='+history.id+']').hide();
				$('#garden-'+history.type+' .fight-history[element_id='+history.id+']').html(history.content);
			}

			// Loaded
			_this.loading = false;
		}
	});

	// Refresh results
	setInterval(function()
	{
		_this.refreshResults();
	}, 2500);
});

/**
 * Fast Garden - Add Event
 */
USERSCRIPT_LW_FAST_GARDEN.on = (function(event, callback)
{
	if (event in this.callbacks)
		this.callbacks[event].push(callback);
});

/**
 * Fast Garden - Submit Fight
 */
USERSCRIPT_LW_FAST_GARDEN.submitFight = (function(type, params, success_callback)
{
	var _this = this;

	if (!this.loading)
	{
		this.loading = true;

		// Submit fight
		_.post('garden/start-'+type+'-fight', params, function(data)
		{
			if (data.success)
			{
				success_callback();

				var fight_id = data.fight;
				_this.addHistory(type, params, fight_id);
				_this.saveHistory();
			}
			_this.refreshInterface(type);
		});

		// Callback : start_fight
		for (var c in this.callbacks['start_fight'])
			this.callbacks['start_fight'][c](type, params);
	}
});

/**
 * Fast Garden - Add Fight Result
 */
USERSCRIPT_LW_FAST_GARDEN.addHistory = (function(type, params, fight_id)
{
	// Solo
	if (type == "solo")
	{
		var myleek_id = $('#garden-solo .myleek.selected').attr('leek');
		var myleek_name = $('#garden-solo .myleek.selected').attr('name');

		var enemy_name = $('#garden-solo .leek[leek='+params.target_id+']').html().split('<br>')[0].split('</svg></div>')[1].replace(/\s/g,"");

		if (!$('#garden-solo .fight-history[element_id='+myleek_id+']').length)
			$('#garden-solo').append('<div class="fight-history" type="solo" element_id="'+myleek_id+'"></div>');
		$('#garden-solo .fight-history[element_id='+myleek_id+']').append('<div class="fight-wrapper" fight="'+fight_id+'"><div class="fight generating"><div class="fighters"><a href="/leek/'+myleek_id+'"><div class="fighter">'+myleek_name+'</div></a><div class="center"><a href="/fight/'+fight_id+'"><img src="https://leekwars.com/static/image/icon/garden.png"></a></div><a href="/leek/'+params.target_id+'"><div class="fighter">'+enemy_name+'</div></a></div></div></div>');
	}

	// Farmer
	if (type == "farmer")
	{
		var enemy_name = $('#garden-farmer .farmer[id='+params.target_id+']').html().split('<br>')[1].replace(/\s/g,"");

		if (!$('#garden-farmer .fight-history').length)
			$('#garden-farmer').append('<div class="fight-history" type="farmer" element_id="0"></div>');
		$('#garden-farmer .fight-history').append('<div class="fight-wrapper" fight="'+fight_id+'"><div class="fight generating"><div class="fighters"><a href="/farmer/'+LW.farmer.id+'"><div class="fighter">'+LW.farmer.name+'</div></a><div class="center"><a href="/fight/'+fight_id+'"><img src="https://leekwars.com/static/image/icon/garden.png"></a></div><a href="/farmer/'+params.target_id+'"><div class="fighter">'+enemy_name+'</div></a></div></div></div>');
	}

	// Team
	if (type == "team")
	{
		var myCompo_id = $('#my-compos .compo.selected').attr('compo');
		var myCompo_name = $('#my-compos .compo.selected').attr('name');
		var enemy_name = $('#garden-team .compo[compo='+params.target_id+']').attr('name');

		if (!$('#garden-team .fight-history[element_id='+myCompo_id+']').length)
			$('#garden-team').append('<div class="fight-history" type="team" element_id="'+myCompo_id+'"></div>');
		$('#garden-team .fight-history[element_id='+myCompo_id+']').append('<div class="fight-wrapper" fight="'+fight_id+'"><div class="fight generating"><div class="fighters"><div class="fighter">'+myCompo_name+'</div><div class="center"><a href="/fight/'+fight_id+'"><img src="https://leekwars.com/static/image/icon/garden.png"></a></div><div class="fighter">'+enemy_name+'</div></div></div></div>');
	}
});

/**
 * Fast Garden - Get fights results
 */
USERSCRIPT_LW_FAST_GARDEN.refreshResults = (function()
{
	var _this = this;

	if (!this.loading)
	{
		// List the fights that have no results
		var waitlist = [];
		$('#garden-page .fight-wrapper').each(function()
		{
			if ($(this).children('.generating').length)
				waitlist.push($(this).attr('fight'));
		});

		// Get fight results
		for (var i = 0; i < waitlist.length; i++)
		{
			if (this.request_counter < 10)
			{
				this.request_counter++;
				_.get('fight/get/' + waitlist[i], function(data)
				{
					_this.request_counter--;
					if (!_this.loading && data.success && data.fight.status == 1)
					{
						// Fight element
						var fight = $('#garden-page .fight-wrapper[fight='+data.fight.id+'] .fight');
						fight.removeClass('generating');

						// Fight result
						fight_result = 'draw';
						if (data.fight.winner == 1)
							fight_result = 'win';
						if (data.fight.winner == 2)
							fight_result = 'defeat';
						fight.addClass(fight_result);

						// Save History
						_this.saveHistory();

						// Callback : fight_result
						for (var c in _this.callbacks['fight_result'])
							_this.callbacks['fight_result'][c](data.fight.id, fight_result, data.fight);
					}
				});
			}
		}
	}
});

/**
 * Fast Garden - Save fights results
 */
USERSCRIPT_LW_FAST_GARDEN.saveHistory = (function()
{
	var _this = this;

	if ($('#garden-page .fight-history').length)
	{
		_this.fight_history = [];
		$('#garden-page .fight-history').each(function()
		{
			_this.fight_history.push({
				type : $(this).attr('type'),
				id : $(this).attr('element_id'),
				content : $(this).html()
			});
		});
	}
});

/**
 * Fast Garden - Refresh interface
 */
USERSCRIPT_LW_FAST_GARDEN.refreshInterface = (function(type)
{
	this.loading = false;

	if (type == 'solo')
	{
		var myleek_id = localStorage["garden/leek"];

		$('.myleek[leek=' + myleek_id + ']').attr('loaded', '');
		LW.pages.garden.load_leek(myleek_id);
	}

	if (type == 'farmer')
	{
		$('#garden-farmer').attr('loaded', '');
		LW.pages.garden.select_farmer();
	}

	if (type == 'team')
	{
		var myCompo_id = localStorage["garden/compo"];

		$('.compo[compo=' + myCompo_id + ']').attr('loaded', '');
		LW.pages.garden.select_composition(myCompo_id);
	}
});

/**
 * Initialisation
 */
window.addEventListener('load', function()
{
	USERSCRIPT_LW_FAST_GARDEN.init();
}, false);

