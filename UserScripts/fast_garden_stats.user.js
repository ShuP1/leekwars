// ==UserScript==
// @name          [Leek Wars] Fast Garden Stats
// @namespace     https://github.com/jonathanjdev/leek-wars-userscripts
// @version       1.2
// @description   Ajoute des statistiques au Fast Garden
// @author        jojo123
// @projectPage   https://github.com/jonathanjdev/leek-wars-userscripts
// @downloadURL   https://github.com/sheychen290/leekwars/raw/master/Us  erScripts/fast_garden_stats.user.js
// @updateURL     https://github.com/sheychen290/leekwars/raw/master/Us  erScripts/fast_garden_stats.user.js
// @match         *://*.leekwars.com/*
// @grant         none
// @run-at        document-start
// ==/UserScript==

/**
 * Fast Garden Stats
 */
USERSCRIPT_LW_FAST_GARDEN_STATS = {
	version: 1.2
};

if (typeof unsafeWindow !== 'undefined')
	unsafeWindow.USERSCRIPT_LW_FAST_GARDEN_STATS = USERSCRIPT_LW_FAST_GARDEN_STATS;

/**
 * Fast Garden Stats - Init
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.init = (function()
{
	var _this = this;

	// Observer
	var observer = undefined;

	// Verification : Fast Garden
	if (typeof USERSCRIPT_LW_FAST_GARDEN === 'undefined')
	{
		alert('"Fast Garden Stats" a besoin de "Fast Garden" pour fonctionner !');
		return;
	}
	if (USERSCRIPT_LW_FAST_GARDEN.version < 1.2)
	{
		alert('"Fast Garden Stats" n\'est pas compatible avec la version installée de "Fast Garden" !');
		return;
	}

	// Event : Reset Leek score
	$(document).on('click', '#fast_garden_reset_leek_stats', function()
	{
		_this.resetLeekScore();
		alert('Opération réalisée !');
	});

	// Event : Reset farmer score
	$(document).on('click', '#fast_garden_reset_farmer_stats', function()
	{
		_this.resetFarmerScore();
		alert('Opération réalisée !');
	});

	// Event : Reset team score
	$(document).on('click', '#fast_garden_reset_team_stats', function()
	{
		_this.resetTeamScore();
		alert('Opération réalisée !');
	});

	// Event : Fast Garden - On Result
	USERSCRIPT_LW_FAST_GARDEN.on('fight_result', function(fight_id, fight_result, fight)
	{
		// Solo
		if (fight.type == 0)
		{
			var my_leek_id = LW.farmer.id in fight.farmers1 ? fight.leeks1[0].id : fight.leeks2[0].id;
			var enemy_leek_id = LW.farmer.id in fight.farmers1 ? fight.leeks2[0].id : fight.leeks1[0].id;
			_this.updateLeekScore(my_leek_id, enemy_leek_id, fight_result);
		}

		// Farmer
		if (fight.type == 1)
		{
			var enemy_farmer_id = fight.farmer1 == LW.farmer.id ? fight.farmer2 : fight.farmer1;
			_this.updateFarmerScore(enemy_farmer_id, fight_result);
		}

		// Team
		if (fight.type == 2)
		{
			var enemy_team_id = fight.team1 == LW.farmer.team.id ? fight.team2 : fight.team1;
			_this.updateTeamScore(enemy_team_id, fight_result);
		}

		// Update interface
		_this.updateInterface(true);
	});

	// Event : pageload
	LW.on('pageload', function()
	{
		if (observer)
		{
			observer.disconnect();
			observer = undefined;
		}

		if (LW.currentPage == 'settings')
		{
			$('#settings-page .flex-container').first().append('<div class="column6"><div class="panel"><div class="header"><h2>Fast Garden Stats</h2></div><div class="content"><div class="button" id="fast_garden_reset_leek_stats">Effacer les statistiques des combats solos</div><br><br><div class="button" id="fast_garden_reset_farmer_stats">Effacer les statistiques des combats éleveurs</div><br><br><div class="button" id="fast_garden_reset_team_stats">Effacer les statistiques des combats en team</div></div></div></div>');
		}

		if (LW.currentPage == 'garden')
		{
			observer = new MutationObserver(function(mutations)
			{
				mutations.forEach(function(mutation)
				{
					_this.updateInterface(false);
				});
			});
			observer.observe(document.querySelector('#garden-page'), {
				attributes: false,
				childList: true,
				characterData: true,
				subtree: true
			});
		}
	});
});

/**
 * Fast Garden Stats - Update Interface
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.updateInterface = (function(force_update)
{
	var _this = this;

	// Force update
	if (force_update)
	{
		$('#garden-page .fast_garden_stats').remove();
	}

	// Leek
	$('#garden-page .opponents .leek').each(function()
	{
		if ($(this).children('.fast_garden_stats').length != 0)
			return;

		var scores = _this.getLeekScore($(this).parents('.enemies').attr('of'), $(this).attr('leek'));
		$(this).append('<div class="fast_garden_stats" style="margin-top:10px"><div style="color:green">Victoires : '+scores.win+'</div><div style="color:grey">Nuls : '+scores.draw+'</div><div style="color:red">Défaites : '+scores.defeat+'</div></div>');
	});

	// Farmer
	$('#garden-page .opponents .farmer').each(function()
	{
		if ($(this).children('.fast_garden_stats').length != 0)
			return;

		var scores = _this.getFarmerScore($(this).attr('id'));
		$(this).append('<div class="fast_garden_stats" style="margin-top:10px"><div style="color:green">Victoires : '+scores.win+'</div><div style="color:grey">Nuls : '+scores.draw+'</div><div style="color:red">Défaites : '+scores.defeat+'</div></div>');
	});

	// Team
	$('#garden-page .opponents .compo').each(function()
	{
		if ($(this).children('.fast_garden_stats').length != 0)
			return;

		var team_id = $(this).children('.emblem').attr('src').replace('.', '/').split('/')[4];
		var scores = _this.getTeamScore(team_id);
		$(this).append('<div class="fast_garden_stats" style="margin-top:10px"><div style="color:green">Victoires : '+scores.win+'</div><div style="color:grey">Nuls : '+scores.draw+'</div><div style="color:red">Défaites : '+scores.defeat+'</div></div>');
	});
});

/**
 * Fast Garden Stats - Update Leek Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.updateLeekScore = (function(my_leek_id, enemy_leek_id, fight_result)
{
	if (!localStorage['FGS_' + LW.farmer.id + '_0_' + my_leek_id + '_' + enemy_leek_id])
		localStorage['FGS_' + LW.farmer.id + '_0_' + my_leek_id + '_' + enemy_leek_id] = '0/0/0';

	var old = localStorage['FGS_' + LW.farmer.id + '_0_' + my_leek_id + '_' + enemy_leek_id].split('/');

	var win = parseInt(old[0]) + (fight_result == 'win' ? 1 : 0);
	var draw = parseInt(old[1]) + (fight_result == 'draw' ? 1 : 0);
	var defeat = parseInt(old[2]) + (fight_result == 'defeat' ? 1 : 0);

	localStorage['FGS_' + LW.farmer.id + '_0_' + my_leek_id + '_' + enemy_leek_id] = win + '/' + draw + '/' + defeat;
});

/**
 * Fast Garden Stats - Update Farmer Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.updateFarmerScore = (function(enemy_farmer_id, fight_result)
{
	if (!localStorage['FGS_' + LW.farmer.id + '_1_' + enemy_farmer_id])
		localStorage['FGS_' + LW.farmer.id + '_1_' + enemy_farmer_id] = '0/0/0';

	var old = localStorage['FGS_' + LW.farmer.id + '_1_' + enemy_farmer_id].split('/');

	var win = parseInt(old[0]) + (fight_result == 'win' ? 1 : 0);
	var draw = parseInt(old[1]) + (fight_result == 'draw' ? 1 : 0);
	var defeat = parseInt(old[2]) + (fight_result == 'defeat' ? 1 : 0);

	localStorage['FGS_' + LW.farmer.id + '_1_' + enemy_farmer_id] = win + '/' + draw + '/' + defeat;
});

/**
 * Fast Garden Stats - Update Team Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.updateTeamScore = (function(enemy_team_id, fight_result)
{
	if (!localStorage['FGS_' + LW.farmer.id + '_2_' + enemy_team_id])
		localStorage['FGS_' + LW.farmer.id + '_2_' + enemy_team_id] = '0/0/0';

	var old = localStorage['FGS_' + LW.farmer.id + '_2_' + enemy_team_id].split('/');

	var win = parseInt(old[0]) + (fight_result == 'win' ? 1 : 0);
	var draw = parseInt(old[1]) + (fight_result == 'draw' ? 1 : 0);
	var defeat = parseInt(old[2]) + (fight_result == 'defeat' ? 1 : 0);

	localStorage['FGS_' + LW.farmer.id + '_2_' + enemy_team_id] = win + '/' + draw + '/' + defeat;
});

/**
 * Fast Garden Stats - Get Leek Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.getLeekScore = (function(my_leek_id, enemy_leek_id)
{
	var stats = (localStorage['FGS_' + LW.farmer.id + '_0_' + my_leek_id + '_' + enemy_leek_id] || '0/0/0').split('/');
	return {
		win: stats[0],
		draw: stats[1],
		defeat: stats[2]
	};
});

/**
 * Fast Garden Stats - Get Farmer Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.getFarmerScore = (function(enemy_farmer_id)
{
	var stats = (localStorage['FGS_' + LW.farmer.id + '_1_' + enemy_farmer_id] || '0/0/0').split('/');
	return {
		win: stats[0],
		draw: stats[1],
		defeat: stats[2]
	};
});

/**
 * Fast Garden Stats - Get Team Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.getTeamScore = (function(enemy_team_id)
{
	var stats = (localStorage['FGS_' + LW.farmer.id + '_2_' + enemy_team_id] || '0/0/0').split('/');
	return {
		win: stats[0],
		draw: stats[1],
		defeat: stats[2]
	};
});

/**
 * Fast Garden Stats - Reset Leek Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.resetLeekScore = (function()
{
	for (var name in localStorage)
		if (name.startsWith('FGS_' + LW.farmer.id + '_0_'))
			localStorage.removeItem(name);
});

/**
 * Fast Garden Stats - Reset Farmer Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.resetFarmerScore = (function()
{
	for (var name in localStorage)
		if (name.startsWith('FGS_' + LW.farmer.id + '_1_'))
			localStorage.removeItem(name);
});

/**
 * Fast Garden Stats - Reset Team Score
 */
USERSCRIPT_LW_FAST_GARDEN_STATS.resetTeamScore = (function()
{
	for (var name in localStorage)
		if (name.startsWith('FGS_' + LW.farmer.id + '_2_'))
			localStorage.removeItem(name);
});

/**
 * Initialisation
 */
window.addEventListener('load', function()
{
	USERSCRIPT_LW_FAST_GARDEN_STATS.init();
}, false);

