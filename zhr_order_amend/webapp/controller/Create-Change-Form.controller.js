sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
function (Controller) {
    "use strict";

    return Controller.extend("com.epiuse.zhrorderamend.controller.Create-Change-Form", {
        onInit() {
            this._setModel();
            // this._setRouter();
        },

        // #region Initialisation
        _setModel:function () {
            const oModel = new sap.ui.model.json.JSONModel({
                changeFromItems: [],
                changeToItems: []
            });
            this.getView().setModel(oModel);
        },

        _setRouter:function () {
            this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("create").attachPatternMatched(this._onObjectMatched, this);
			this.oRouter.getRoute("edit").attachPatternMatched(this._onEditMatched, this);
        },
        // #endregion

        // #region
        _onObjectMatched: function (oEvent) {

			const oUserInfoService = sap.ushell.Container.getService("UserInfo");
			const oUser = oUserInfoService.getUser();
				
			this.sInitiator = oUser.getFullName();

			// Init the attachment model
			const oAttachments = new JSONModel([]);
			oAttachments.items = [];
			this.getOwnerComponent().setModel(oAttachments, "oModelAttach");

			// Set the uuid for the instance of creation
			this.uuid = this._generateUUID();

			// Set the title of the view
			this.getView().byId("ttlCr").setText(this.getResourceBundle().getText("xhedCrHead"));

			// Reset Wi
			this.sWi = null;

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Get the Id for the form from the parameters
			const sType = oEvent.getParameter("arguments").type;

			if (sType === "new") {
				// Instantiate the model used to submit the request
				const oContAssess = {};

				// Set the the object to the model used by the form
				const oContAssessModel = new JSONModel(oContAssess);
				this.getOwnerComponent().setModel(oContAssessModel, "formDetails");
			}
		},

        // Generate unique instance id
		_generateUUID: function () {
			const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			let uuid = '';
			for (let i = 0; i < 26; i++) {
				const randomIndex = Math.floor(Math.random() * characters.length);
				uuid += characters.charAt(randomIndex);
			}
			return uuid;
		},
        // #endregion
        
        // #region handleLiveChange
        handleLiveChange: function (oEvent) {
            const ValueState = coreLibrary.ValueState;
			const oTextArea = oEvent.getSource(),
				iValueLength = oTextArea.getValue().length,
				iMaxLength = oTextArea.getMaxLength(),
				sState = iValueLength > iMaxLength ? ValueState.Warning : ValueState.None;

			oTextArea.setValueState(sState);
		},
        // #endregion

        // #region onPlantConfirmationChange
        onPlantConfirmationChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oUploadHBox = this.byId("hbxUploadDocument");

            if (sSelectedKey === "Yes") {
                oUploadHBox.setVisible(true);
            } else {
                oUploadHBox.setVisible(false);
            }
        },
        // #endregion

        // #region onOrderProgressSelect
        onOrderProgressSelect: function (oEvent) {
            const oSelectedCheckBox = oEvent.getSource();
        
            // Only proceed if the checkbox was just selected
            if (oSelectedCheckBox.getSelected()) {
                // List of all checkbox IDs
                var aCheckBoxIds = [
                    "chk1", "chk2", "chk3", "chk4", "chk5", "chk6", "chk7"
                ];
        
                aCheckBoxIds.forEach((sId) => {
                    var oCheckBox = this.byId(sId);
                    if (oCheckBox && oCheckBox !== oSelectedCheckBox) {
                        oCheckBox.setSelected(false);
                    }
                });
            }
        } ,
        // #endregion

        // #region onAddItem
        onAddItem: function () {
            const oModel = this.getView().getModel();

            // Handle both tables
            ["changeFromItems", "changeToItems"].forEach(function (sPath) {
                const aItems = oModel.getProperty("/" + sPath) || [];

                const oNewItem = {
                    lineNumber: aItems.length + 1,
                    uniqueCode: "",
                    quantity: "",
                    price: "",
                    totalAmount: "",
                    stockAmount: "",
                    deliveryDate: null
                };

                aItems.push(oNewItem);
                oModel.setProperty("/" + sPath, aItems);
            });

            // Show the total HBox since we now have at least one row
            const oHBoxChangeFrom = this.byId("hbxChangeFrom");
            const oHBoxChangeTo = this.byId("hbxChangeTo");
            if (oHBoxChangeFrom && oHBoxChangeTo) {
                oHBoxChangeFrom.setVisible(true);
                oHBoxChangeTo.setVisible(true);
            }
        },    
        // #endregion

        // #region onDeleteItem
        onDeleteItem: function (oEvent) {
            const oModel = this.getView().getModel();

            // Get the clicked row context and extract the lineNumber
            const oContext = oEvent.getSource().getBindingContext();
            const iLineNumber = oContext.getProperty("lineNumber");

            // Helper to filter out the matching row by lineNumber
            function removeByLineNumber(aItems) {
                return aItems.filter(function (item) {
                    return item.lineNumber !== iLineNumber;
                }).map(function (item, index) {
                    item.lineNumber = index + 1; // Re-number after deletion
                    return item;
                });
            }

            // Remove from both arrays
            const aChangeFrom = oModel.getProperty("/changeFromItems");
            const aChangeTo = oModel.getProperty("/changeToItems");

            const aUpdatedChangeFrom = removeByLineNumber(aChangeFrom);
            const aUpdatedChangeTo = removeByLineNumber(aChangeTo);

            oModel.setProperty("/changeFromItems", aUpdatedChangeFrom);
            oModel.setProperty("/changeToItems", aUpdatedChangeTo);

            // Hide the total HBox if there are no rows left
            const oHBoxChangeFrom = this.byId("hbxChangeFrom");
            const oHBoxChangeTo = this.byId("hbxChangeTo");
            if (oHBoxChangeFrom && oHBoxChangeTo && aUpdatedChangeFrom.length === 0) {
                oHBoxChangeFrom.setVisible(false);
                oHBoxChangeTo.setVisible(false);
            }
        } ,   
        // #endregion

        // #region onBeforeUploadStarts
        onBeforeUploadStarts: function (oEvent) {
			const oHeaderItem = oEvent.getParameter("item");
			const slugVal = oHeaderItem.getFileName() + "," + this.uuid + ",ZCA_ATTACH";

			oHeaderItem.removeAllStatuses();

			oHeaderItem.addHeaderField(new sap.ui.core.Item({
				key: "slug",
				text: slugVal
			}));

			oHeaderItem.addHeaderField(new sap.ui.core.Item({
				key: "x-csrf-token",
				text: this.getOwnerComponent().getModel().getSecurityToken()
			}));
		},
        // #endregion

        // #region onUploadComplete
        onUploadComplete: function (oEvent) {
			const oStatus = oEvent.getParameter("status"),
				oItem = oEvent.getParameter("item"),
				oUploadSet = this.getView().byId("usAttach");

			if (oStatus && oStatus !== 201) {
				oItem.setUploadState("Error");
				oItem.removeAllStatuses();
			} else {
				oUploadSet.removeIncompleteItem(oItem);
				this._setAttachmentModel();
			}
		},
        // #endregion

        // #region onRemovePressed
        onRemovePressed: function (oEvent) {
			// Prevent the default confirmation popup
			oEvent.preventDefault();

			// Get the item details
			const oItem = oEvent.getSource(),
				sGuid = oItem.getBinding("fileName").getContext().getObject().Guid,
				that = this;

			// Build the path to the AttachmentSet entity
			const sPath = "/AttachmentSet('" + sGuid + "')";

			// Remove the attachment from the backend
			this.getOwnerComponent().getModel().remove(sPath, {
				success: function () {
					// Refresh the list
					that._setAttachmentModel();
					sap.m.MessageToast.show("Attachment removed from request");
				},
				error: function () {
					sap.m.MessageToast.show("Error occured reading data");
				}
			});
		},
        // #endregion
    });
});