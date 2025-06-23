sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../utils/formatter",
	"sap/m/library",
	"sap/ui/core/Fragment",
	"sap/ui/core/format/DateFormat",
	'sap/m/MessageToast',
	"../lib/html2pdf"
], function (BaseController, JSONModel, formatter, mobileLibrary, Fragment, DateFormat, MessageToast, HTMLtoPDF) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("com.epiuse.zhrorderamend.controller.Form-Detail", {

		formatter: formatter,

        onInit: function () {
            // this._getFormData();
            const oRouter = this.getOwnerComponent().getRouter();
            const oRoute = oRouter.getRoute("object");

            // Attach handler to run every time the route is matched
            oRoute.attachPatternMatched(this._onObjectMatched, this);
        },

        _getFormData: function (sWorkItemId) {
            const oModel = this.getOwnerComponent().getModel();
			
			oModel.read(`/FormSet('${sWorkItemId}')`, {
				success: (oFormData) => {                    
                    if (oFormData) {
                        const sPayload = oFormData.Payload;
                        const oPayload = JSON.parse(sPayload);
                        const oJsonModel = new JSONModel(oPayload.ChangeFromItems);
                        this.getView().setModel(oJsonModel, "changeFromPayload");

                        console.log("model: ", this.getView().getModel("changeFromPayload"));
                        

                        this.byId("txtDetailTitle").setText(oFormData.Title || "Amendment/Cancellation Form Details");

                        this.byId("oaWorkItem").setText(oFormData.Wi);
                        this.byId("oaCreatedDate").setText(formatter.formatLongDate(oFormData.CreateDate, oFormData.CreateTime));

                        this.byId("txtdRequestedBy").setText(oPayload.RequestedBy);
                        this.byId("txtdCustomerName").setText(oPayload.CustomerName);
                        this.byId("txtdBranchName").setText(oPayload.BranchOrSectorName);
                        this.byId("txtdPoDate").setText(oPayload.PoDate);
                        
                        this.byId("txtdRequstDate").setText(oPayload.RequestedDate);
                        this.byId("txtdContractNumber").setText(oPayload.PoContractNumber);
                        this.byId("txtdSalesOrderNo").setText(oPayload.SalesOrderNumber);
                        this.byId("txtdAmendment").setText(oPayload.RequestTypeAmendment);
                        this.byId("txtdCancellation").setText(oPayload.RequestTypeCancellation);
                    }
				}
			})
        },

        _extractWorkItemNumberFromURL: function () {
            const sUrl = window.location.href;
            const match = sUrl.match(/\/FormSet\/(\d+)$/);
            return match ? match[1] : null;
        }, 

        _onObjectMatched: function (oEvent) {
            const sWorkItemId = oEvent.getParameter("arguments").objectId;
            this._getFormData(sWorkItemId);
        },
        
        _setRouter:function () {
            this.oRouter = this.getOwnerComponent().getRouter();
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("wfobject").attachPatternMatched(this._onObjectMatchedWF, this);
        },

        // #region Control Functions

        // Edit a workflow that requires attention
		onEdit: function (oEvent) {

			// Get the payload of the form to be resubmitted
			var oFormReq = oEvent.getSource().getBindingContext().getObject(),
				oPayload,
				sWi = this.getView().getBindingContext().getObject().Wi;

			// Parse the string to object
			if (oFormReq.Payload) {
				oPayload = JSON.parse(oFormReq.Payload);
			}
			
			// Convert the date time format to usuable format
			if (oPayload.closingDateTime) {
				oPayload.closingDateTime = new Date(oPayload.closingDateTime);
			}
			
			if (oPayload.validityPeriodStart) {
				oPayload.validityPeriodStart = new Date(oPayload.validityPeriodStart);
			}
			
			if (oPayload.validityPeriodEnd) {
				oPayload.validityPeriodEnd = new Date(oPayload.validityPeriodEnd);
			}
			
			if (oPayload.fixFirmPeriodStart) {
				oPayload.fixFirmPeriodStart = new Date(oPayload.fixFirmPeriodStart);
			}
			
			if (oPayload.fixFirmPeriodEnd) {
				oPayload.fixFirmPeriodEnd = new Date(oPayload.fixFirmPeriodEnd);
			}

			// Set the payload details
			var oOrderAmendmentsModel = new JSONModel(oPayload);
			this.getOwnerComponent().setModel(oOrderAmendmentsModel, "formDetails");

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Navigate to create a new form
			this.oRouter.navTo("edit", {
				wi: sWi
			});
		},

        // Resubmit a rejected workflow
		onResubmit: function (oEvent) {
			// Get the payload of the form to be resubmitted
			const oFormReq = oEvent.getSource().getBindingContext().getObject();
			let oPayload;

			// Parse the string to object
			if (oFormReq.Payload) {
				oPayload = JSON.parse(oFormReq.Payload);
			}
			
			// Convert the date time format to usuable format
			if (oPayload.closingDateTime) {
				oPayload.closingDateTime = new Date(oPayload.closingDateTime);
			}
			
			if (oPayload.validityPeriodStart) {
				oPayload.validityPeriodStart = new Date(oPayload.validityPeriodStart);
			}
			
			if (oPayload.validityPeriodEnd) {
				oPayload.validityPeriodEnd = new Date(oPayload.validityPeriodEnd);
			}
			
			if (oPayload.fixFirmPeriodStart) {
				oPayload.fixFirmPeriodStart = new Date(oPayload.fixFirmPeriodStart);
			}
			
			if (oPayload.fixFirmPeriodEnd) {
				oPayload.fixFirmPeriodEnd = new Date(oPayload.fixFirmPeriodEnd);
			}

			// Set the payload details
			const oCredAppModel = new JSONModel(oPayload);
			this.getOwnerComponent().setModel(oCredAppModel, "formDetails");

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Navigate to create a new form
			this.oRouter.navTo("create", {
				type: "resub"
			});
		},

        onPrintPDF: function () {
			// Set invisible components
			this.getView().byId("taNote").setVisible(false);
			this.getView().byId("btnSave").setVisible(false);

			// Expand status table
			this.getView().byId("tblWorkflowHistory").expandToLevel(2);

			// Expand header
			this.getView().byId("detailPage").setHeaderExpanded(true);

			sap.ui.getCore().applyChanges();

			setTimeout(() => {
				// Get form which needs to be printed
				const oElement = this.getView().getDomRef("-detailPage");

				// Get the current timestamp
				let sTimestamp = new Date().toISOString().replace(/[-:.]/g, '');
				let sWI = this.sWi;
				let sFilename = `gen_req_${sWI}_${sTimestamp}.pdf`;

				// Set config of pdf
				const oOptions = {
					margin: 0.5,
					filename: sFilename,
					image: {
						type: 'jpeg',
						quality: 1
					},
					html2canvas: {
						scale: 2
					},
					jsPDF: {
						unit: 'in',
						format: 'letter',
						orientation: 'portrait'
					},
					pagebreak: {
						mode: 'avoid-all'
					}
				};

				HTMLtoPDF().set(oOptions).from(oElement).save();

				// Set visible components
				this.getView().byId("taNote").setVisible(true);
				this.getView().byId("btnSave").setVisible(true);
			}, 2000);
		},

        onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

        toggleFullScreen: function () {
			const bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},
        // #endregion

    });

});