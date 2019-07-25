/*
 * Basic responsive mashup template
 * @owner Shin
 */
/*
 *    Fill in host and port for Qlik engine
 */
var prefix = window.location.pathname.substr(0, window.location.pathname.toLowerCase().lastIndexOf("/extensions") + 1);
var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
require.config({
	baseUrl: (config.isSecure ? "https://" : "http://") + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources"
});

require(["js/qlik", "text!/extensions/QlikMashupTraining/card.html", "text!/extensions/QlikMashupTraining/cardReloadTemplate.html"]
	, function (qlik, cardTemplate, cardReloadTemplate) {

		qlik.setOnError(function (error) {
			$('#popupText').append(error.message + "<br>");
			$('#popup').fadeIn(1000);
		});
		$("#closePopup").click(function () {
			$('#popup').hide();
		});

		//callbacks -- inserted here --
		//open apps -- inserted here --
		//var app = qlik.openApp('9ce2eb87-2671-41c0-9347-c17fe4ee6134', config);

		//QRS calls
		var applist = '';
		$.ajax({
			method: 'GET',
			headers: {
				//	"user": "qlikadmin",
				"x-Qlik-Xrfkey": "1234567890abcdef"
			},
			url: "https://qsapitest/qrs/app/hublist?Xrfkey=1234567890abcdef",
			success: function (response) {
				console.log(response);
				applist = response;
			}
		})

		//get objects -- inserted here --
		// Create nav action
		window.showChart = function (navActive) {
			// Home Page
			if (navActive === 'navActive0') {
				$("#card-template").empty();
				var app = qlik.openApp('9ce2eb87-2671-41c0-9347-c17fe4ee6134', config);
				app.getObject('card-template', 'jDwNjkJ');
			}
			// App List
			if (navActive === 'navActive1') {
				subGenAppList();
			}
			// Task Overview
			if (navActive === 'navActive2') {
				subChartTree(); // Relationship chart
			}
			// Task Schedule
			if (navActive === 'navActive3') {
				subReloadApp();
			}
			// Highlight current element on nav bar // class =. id =#
			$(".nav-item").removeClass("active"); // find all active and remove
			$("." + navActive).addClass("active");  // add active on selected nav
		};
		// Button function
		window.openApp = function (param) {
			console.log('Open' + param);
			window.open("https://qsapitest/sense/app/" + param);
		};
		// Application tab
		function subGenAppList() {
			$("#card-template").empty();
			applist.forEach(function (fieldValue) {

				var newCard = $(cardTemplate);

				newCard.find('.card-name').text(fieldValue.name)
				newCard.find('.publish-time').text(fieldValue.publishTime)
				newCard.find('.card-Openbtn').on('click', function () {
					openApp(fieldValue.id);
				});

				if (fieldValue.published === true) {
					newCard.find("#btnGroupDrop1").on('click', function () {
						alert("Published app cannot republished");
					});
				} else {
					applist.forEach(function (rowCheck) {
						if (rowCheck.published === true) { // only create published app list 
							console.log("Button List :" + rowCheck.name);
							var option = $("<a class='dropdown-item'>" + rowCheck.name + "</a>");
							option.on("click", function () {
								//duplicate
								var curDate = new Date();
								$.ajax({
									method: 'POST',
									headers: {
										"x-Qlik-Xrfkey": "1234567890abcdef"
									},
									url: "https://qsapitest/qrs/app/" + rowCheck.id + "/copy?name="
										+ rowCheck.name + "_bkp" + curDate.getFullYear() + curDate.getMonth() + curDate.getDate() //+ curDate.getHours() + curDate.getMinutes() + curDate.getSeconds() 
										+ "&Xrfkey=1234567890abcdef",
									success: function (response) {
										alert("Press F5 to refresh list.");
										//overwrite / publish
										$.ajax({
											method: 'PUT',
											headers: {
												"x-Qlik-Xrfkey": "1234567890abcdef"
											},
											url: "https://qsapitest/qrs/app/" + response.id + "/replace?app=" + rowCheck.id + "&Xrfkey=1234567890abcdef",
											success: function (response) {
												alert("Publish Success !");
											}
										})
									}
								})
							});
							newCard.find("#publish-dropdown").append(option);
						}
					});
				}
				$("#card-template").append(newCard);
			});
		};
		// Task > Overview
		function subChartTree() {
			$("#card-template").empty();
			var app = qlik.openApp('124bd22e-a960-4c8a-94e9-424aeb28341f', config);

			app.createCube({
				qDimensions: [
					{ qDef: { qFieldDefs: ["T1"] } },
					{ qDef: { qFieldDefs: ["T2"] } },
					{ qDef: { qFieldDefs: ["T3"] } }
				],
				qMeasures: [
					{ qDef: { qDef: "1" } }
				],
				qInitialDataFetch: [{
					qTop: 0,
					qLeft: 0,
					qHeight: 20,
					qWidth: 3
				}]
			}, function (reply) {
				var data =[];
				// Outer Loop
				reply.qHyperCube.qDataPages[0].qMatrix.forEach(function (qRow) {
					var found;
					data.forEach(function (item) {
						if (item.name === qRow[0].qText) {
							found = item;
						}
					});
					if (found) {
						found.children.push({
							name: qRow[1].qText,
							//, value: qRow[2].qNum
						});
					} else {
						var newChild = {
							name: qRow[0].qText,
							children: [{
								name: qRow[1].qText
								//, value: qRow[2].qNum
							}]
						};
						data.push(newChild);
					}
				});
				//console.log(data);// Write Outer Loop

				var newData = [{
					name: 'AppSchedule', // By right should get end of child
					children: data
				}];

				option = {
					legend: {
						top: '2%',
						left: '3%',
						orient: 'vertical',
						data: [{
							name: 'tree1',
							icon: 'circle'
						} ,
						{
							name: 'tree2',
							icon: 'circle'
						}],
						borderColor: '#c23531'
					},
					series:[
						{
							type: 'tree',
							name: 'Qlik Scheduler',
							data: newData,
							top: '5%',
							left: '7%',
							bottom: '2%',
							right: '60%',
							symbolSize: 7,
							label: {
								normal: {
									position: 'left',
									verticalAlign: 'middle',
									align: 'right'
								}
							},
							leaves: {
								label: {
									normal: {
										position: 'right',
										verticalAlign: 'middle',
										align: 'left'
									}
								}
							},
							expandAndCollapse: true,
							animationDuration: 550,
							animationDurationUpdate: 750
						}
					]
				};
				console.log(option);
				var myChart = echarts.init(document.getElementById('card-template'));
				myChart.setOption(option);
			});

		};
		// Task > Schedule
		function subReloadApp() {

			$("#card-template").empty();
			var newReloadTemplate = $(cardReloadTemplate);

			// One Task
			newReloadTemplate.find(".card-ReloadName").text("AppTest");
			newReloadTemplate.find(".card-ReloadDesc").text("Contains preceeding apps for App Test");
			var reloadEnd = $("<button type='button' id='reloadButton' class='card-link btn-block btn btn-primary'>Reload</button>");
			var c = newReloadTemplate.find(".cardReloadStatus");
			c.append(reloadEnd);
			var tasklist = ['1.1 Extract', '2.1 DM', 'AppTest'];
			tasklist.forEach(function (list) {
				var optlist = $("<li class='list-group-item'>" + list + "</li>");
				newReloadTemplate.find(".reloadList").append(optlist);
			})
			newReloadTemplate.find('#reloadButton').on('click', function () {
				console.log("Start Reload...");
				var reloadStart = $("<div class='spinner-grow text-success cardReloadStatus' role='status'><span class='sr-only'>Loading...</span> </div>");// add reload gif
				c.empty();
				c.append(reloadStart);
				var app = qlik.openApp('124bd22e-a960-4c8a-94e9-424aeb28341f', config);
				// Add loop for lineage reload
				app.doReload().then(function () {
					app.doSave().then(function () {
						console.log("End Reload...");
						c.empty();
						c.append(reloadEnd);
					});
				});
			});
			$("#card-template").append(newReloadTemplate);
			// Second Task

		};
	});
