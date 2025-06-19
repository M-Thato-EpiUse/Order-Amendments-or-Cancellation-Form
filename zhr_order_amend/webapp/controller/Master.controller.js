sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"../utils/formatter"
], function (BaseController, JSONModel, History, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter) {
	"use strict";

	return BaseController.extend("com.epiuse.zhrorderamend.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			this.oRouter = this.getOwnerComponent().getRouter();

			this.setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);
			
			// Save process filter for reference
			this._oProcessFilter = new sap.ui.model.Filter("Process", sap.ui.model.FilterOperator.EQ, "ORDAMD");
		},		

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		onUpdateFinished: function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
		},

		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [
					new Filter({
						filters: [
							new Filter("Wi", FilterOperator.Contains, sQuery),
							this._oProcessFilter
						],
						and: true
					})
				];
			} else {
				this._oListFilterState.aSearch = [this._oProcessFilter];
			}
			this._applyFilterSearch();

		},

		onRefresh: function () {
			this._oList.getBinding("items").refresh();
		},

		onOpenViewSettings: function (oEvent) {
			var sDialogTab = "filter";
			if (oEvent.getSource() instanceof sap.m.Button) {
				var sButtonId = oEvent.getSource().getId();
				if (sButtonId.match("sort")) {
					sDialogTab = "sort";
				} else if (sButtonId.match("group")) {
					sDialogTab = "group";
				}
			}
			// load asynchronous XML fragment
			if (!this.byId("viewSettingsDialog")) {
				Fragment.load({
					id: this.getView().getId(),
					name: "com.epiuse.zhrorderamend.view.fragments.ViewSettings",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					oDialog.open(sDialogTab);
				}.bind(this));
			} else {
				this.byId("viewSettingsDialog").open(sDialogTab);
			}
		},

		// Open the filter and search fragment
		onOpenDialog: function () {

			if (!this._pDialog) {
				this._pDialog = Fragment.load({
					name: "com.epiuse.zhrorderamend.view.fragments.ViewSettings",
					controller: this
				});
			}

			this._pDialog.then(function (oDialog) {
				oDialog.open();
			}.bind(this));
		},

		onConfirmViewSettingsDialog: function (oEvent) {

			this._applySortGroup(oEvent);
		},

		_applySortGroup: function (oEvent) {
			var mParams = oEvent.getParameters(),
				sPath,
				bDescending,
				aSorters = [];
			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));
			this._oList.getBinding("items").sort(aSorters);
		},

		onSelectionChange: function (oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {

				// Get the details of the selected item to extract the payload
				var oRequest = oEvent.getSource().getSelectedItem().getBindingContext().getObject(),
					oJsonReq,
					aAcknowledgements;					

				// If there is a json payload parse it
				if (oRequest.Payload) {
					oJsonReq = JSON.parse(oRequest.Payload);
				}
				
				// Convert the date time format to usuable format
				if (oJsonReq.closingDateTime) {
					oJsonReq.closingDateTime = new Date(oJsonReq.closingDateTime);
				}
				
				if (oJsonReq.validityPeriodStart) {
					oJsonReq.validityPeriodStart = new Date(oJsonReq.validityPeriodStart);
				}
				
				if (oJsonReq.validityPeriodEnd) {
					oJsonReq.validityPeriodEnd = new Date(oJsonReq.validityPeriodEnd);
				}
				
				if (oJsonReq.fixFirmPeriodStart) {
					oJsonReq.fixFirmPeriodStart = new Date(oJsonReq.fixFirmPeriodStart);
				}
				
				if (oJsonReq.fixFirmPeriodEnd) {
					oJsonReq.fixFirmPeriodEnd = new Date(oJsonReq.fixFirmPeriodEnd);
				}

				oJsonReq.viewHistory = true;

				// Initialise new note as blank
				oJsonReq.newNote = "";

				// Set the payload details
				var oMotGenReq = new JSONModel(oJsonReq);
				this.getOwnerComponent().setModel(oMotGenReq, "formDetails");

				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		onBypassed: function () {
			this._oList.removeSelections(true);
		},

		createGroupHeader: function (oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text,
				upperCase: false
			});
		},

		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: "#Shell-home"
					}
				});
			}
		},

		// Create a new form request
		onCreatePress: function (oEvent) {

			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Nav to the create view
			this.oRouter.navTo("create", {
				type: "new"
			});
		},

		handleConfirmViewSettings: function (oEvent) {
			// Destructure the event parameters
			const {
				filterString,
				filterKeys,
				sortItem,
				sortDescending
			} = oEvent.getParameters();

			// Get the list and its binding
			const list = this.getView().byId("list");
			const binding = list.getBinding("items");

			// Apply filters if filter keys exist
			if (filterKeys) {
				// Create filters based on filter keys
				const filters = Object.keys(filterKeys).map(key => new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, key));
				binding.filter(filters);

				// Update filter bar and label
				const filterBar = this.byId("vsdFilterBar");
				const filterLabel = this.byId("vsdFilterLabel");
				filterBar.setVisible(filters.length > 0);
				filterLabel.setText(filterString);
			}

			// Apply sorting if a sort item is selected
			if (sortItem && sortItem.getSelected()) {
				const key = sortItem.getKey();
				const sorters = [new sap.ui.model.Sorter(key, sortDescending)];

				// Check if sorting by CreateDate and include sorting by CreateTime
				if (key === "CreateDate") {
					sorters.push(new sap.ui.model.Sorter("CreateTime", sortDescending));
				}

				binding.sort(sorters);
			}

			// Refresh the binding to apply filters and sorting
			binding.refresh();
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_createViewModel: function () {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Wi",
				groupBy: "None"
			});
		},

		_onMasterMatched: function () {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Refresh the binding of the list to load any new requests
			var oList = this.getView().byId("list");
			var oBinding = oList.getBinding("items");
			oBinding.refresh();
			
			// Save the original selection mode
            var sSelectionMode = oList.getMode();

            // Temporarily set the selection mode to "None"
            oList.setMode(sap.m.ListMode.None);

            // Set the selection mode back to the original mode
            oList.setMode(sSelectionMode);
		},
		
		_showDetail: function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Wi")
			}, bReplace);
		},

		_updateListItemCount: function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		_applyFilterSearch: function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		_updateFilterBar: function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		}

	});
});