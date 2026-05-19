// ZZ180dPackagingVcPackagingVFG, ZZ180sPackagingVFG,  ZZ180aPackagingVFG
// ZZ90dPreAssembly, ZZ90cPreAssembly, ZZ90sPreAssembly, ZZ90aPreAssembly
// ZZ100dBowl, ZZ100cBowl, ZZ100sBowl, ZZ100aBowl
// ZZ110dFinAssemDelDue, ZZ110cFinAssemDelDue, ZZ110sFinAssemDelDue, ZZ110aFinAssemDelDue
// ZZ115dEndtestBench, ZZ115cEndtestBench, ZZ115sEndtestBench, ZZ115aEndtestBench
// ZZ170dFinalAssembly, ZZ170cFinalAssembly, ZZ170sFinalAssembly, ZZ170aFinalAssembly

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("sap.ui.test.controller.View1", {
        onInit() {
            const oModel = new JSONModel();
            oModel.attachRequestCompleted(() => {
                console.log("Data:", oModel.getData());
            });
            oModel.attachRequestFailed((e) => {
                console.error("Failed:", e);
            });
            oModel.loadData(
                sap.ui.require.toUrl("sap/ui/test/model/mockData.json")
            );
            this.getView().setModel(oModel);
        },

        onOpenRemark: function (oEvent) {
            if (!this._oNotePopover) {
                this._oNotePopover = sap.ui.xmlfragment(
                    "sap.ui.test.fragments.RemarkPopover",
                    this
                );
                this.getView().addDependent(this._oNotePopover);
            }

            this._oNotePopover.setBindingContext(
                oEvent.getSource().getBindingContext()
            );

            this._oNotePopover.openBy(oEvent.getSource());
        },

        onCloseNote: function () {
            this._oNotePopover.close();
        },

        onSaveNote: function () {
            this._oNotePopover.close();
            // Persist note if needed
        },
        // ── Step 1: Read SalesOrder list ─────────────────────────────────────────────
        _loadSalesOrders: function () {
            const oModel = this.getView().getModel();
            const oListBinding = oModel.bindList(
                "/SalesOrder",
                null,
                [],
                aTopFilters,          // your pre-built filters from oParams
                {
                    $$updateGroupId: "$auto",
                    $count: true,
                    $select: "SalesOrderNumber,UUID,Customer",
                }
            );

            oListBinding
                .requestContexts(0, 500)
                .then((aContexts) => {
                    // Extract plain objects from contexts
                    const aRows = aContexts.map((oCtx) => oCtx.getObject());

                    // ── Step 2: For every row fire Event read using UUID ────────────────
                    // Promise.all waits for ALL event reads to finish before setting model
                    return Promise.all(
                        aRows.map((oRow) => this._fetchEventDates(oModel, oRow))
                    );
                })
                .then((aEnrichedRows) => {
                    // ── Step 3: Set enriched rows (SalesOrder + Event dates) to model ───
                    const oTableModel = this.getView().getModel("tableModel");
                    oTableModel.setProperty("/items", aEnrichedRows);
                    oTableModel.setProperty("/resultCount", aEnrichedRows.length);
                    oTableModel.setProperty("/busy", false);
                })
                .catch((oError) => {
                    this.getView().getModel("tableModel").setProperty("/busy", false);
                    console.error("[SalesOrder] Load failed:", oError);
                });
        },

        // ── Step 2 helper: Fetch Event entity for ONE row using UUID ─────────────────
        /**
         * Reads /Event(UUID='<uuid>') for a single SalesOrder row.
         * Merges ETA, DueDate, ArrivalDate into the row object.
         * Always resolves — never rejects — so one failed row
         * does not abort the entire Promise.all.
         *
         * @param  {sap.ui.model.odata.v4.ODataModel} oModel
         * @param  {object}                            oRow    - Single SalesOrder row
         * @returns {Promise<object>}                           - Row enriched with dates
         */
        _fetchEventDates: function (oModel, oRow) {
            return new Promise((resolve) => {

                // Guard — if UUID is missing, resolve with empty dates immediately
                if (!oRow.UUID) {
                    resolve(Object.assign({}, oRow, {
                        ETA: null,
                        DueDate: null,
                        ArrivalDate: null,
                    }));
                    return;
                }

                // Build context path for single Event entity keyed by UUID
                // → /Event(UUID='abc-123-def-456')
                const sEventPath = "/Event(UUID='" + oRow.UUID + "')";

                const oContextBinding = oModel.bindContext(
                    sEventPath,
                    null,
                    {
                        $$updateGroupId: "$auto",
                        $select: "ETA,DueDate,ArrivalDate",
                    }
                );

                oContextBinding
                    .requestObject()
                    .then((oEvent) => {
                        // Merge Event dates flat into the SalesOrder row
                        resolve(Object.assign({}, oRow, {
                            ETA: oEvent.ETA || null,
                            DueDate: oEvent.DueDate || null,
                            ArrivalDate: oEvent.ArrivalDate || null,
                        }));
                    })
                    .catch((oError) => {
                        // One row failed — resolve with empty dates
                        // so remaining rows in Promise.all are not affected
                        console.warn("[Event] Fetch failed for UUID:", oRow.UUID, oError);
                        resolve(Object.assign({}, oRow, {
                            ETA: null,
                            DueDate: null,
                            ArrivalDate: null,
                        }));
                    });

            });
        },

        _fetchEventDatesInChunks: function (oModel, aRows, iChunkSize) {
            const aChunks = [];

            // Split aRows into chunks of iChunkSize
            // 500 rows / 20 = 25 chunks
            for (let i = 0; i < aRows.length; i += iChunkSize) {
                aChunks.push(aRows.slice(i, i + iChunkSize));
            }

            // Process each chunk sequentially using reduce
            // chunk 1 completes → chunk 2 fires → chunk 3 fires ...
            return aChunks.reduce((oPrevPromise, aChunk) => {
                return oPrevPromise.then((aAccumulatedRows) => {

                    // Within one chunk — fire all reads in parallel
                    return Promise.all(
                        aChunk.map((oRow) => this._fetchEventDates(oModel, oRow))
                    ).then((aChunkResults) => {
                        // Accumulate results from all chunks
                        return aAccumulatedRows.concat(aChunkResults);
                    });

                });
            }, Promise.resolve([]));   // start with empty accumulated array
        },

        getIconColor: function (sDueDateA, sDueDateB, sIcon) {

            const COLORS = {
                GREEN: "#2b7c2b",   // positive green
                ORANGE: "#e76500",   // warning orange
                RED: "#bb0000",   // negative red
                GREY: "#8c8c8c",   // inactive grey
            };

            // Guard — if either date missing return grey for all icons
            if (!sDueDateA || !sDueDateB) return COLORS.GREY;

            const dA = new Date(sDueDateA);  // parse to Date for comparison
            const dB = new Date(sDueDateB);

            // Guard — invalid date values
            if (isNaN(dA.getTime()) || isNaN(dB.getTime())) return COLORS.GREY;

            // ── DueDate_A > DueDate_B → icon3 RED, rest GREY ─────────────────────
            if (dA > dB) {
                return sIcon === "icon3" ? COLORS.RED : COLORS.GREY;
            }

            // ── DueDate_A === DueDate_B → icon2 ORANGE, rest GREY ────────────────
            if (dA.getTime() === dB.getTime()) {
                return sIcon === "icon2" ? COLORS.ORANGE : COLORS.GREY;
            }

            // ── DueDate_A < DueDate_B → icon1 GREEN, rest GREY ───────────────────
            return sIcon === "icon1" ? COLORS.GREEN : COLORS.GREY;
        },

        // ── Step 1: Checkbox selection — store selected SalesOrder numbers ──────────
        onSelectionChange: function (oEvent) {
            const oTable = this.byId("table0");
            const aSelectedItems = oTable.getSelectedItems();

            // Extract SalesOrderNumber from each selected row
            const aSelectedOrders = aSelectedItems.map(function (oItem) {
                return oItem.getBindingContext().getProperty("salesOrderNumber");
            });

            // Store in model for use on button press
            this.getView().getModel().setProperty("/selectedOrders", aSelectedOrders);

            console.log("Selected Orders:", aSelectedOrders);
        },

        onRemarkPress: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
        },

        onBeforeRebindTableExtension: function (oEvent) {
            var oBindingParams = oEvent.getParameter("bindingParams");

            var oView = this.getView();

            var sMSStatus = this._oAppView.getProperty("/SelectedMilestone");
            var sMSType = this._oAppView.getProperty("/SelectedMsTypes");

            var oDateRange = oView.byId(
                "orders::SalesOrderItemList--fe::filterBar::SalesOrderItem::Custom"
            );

            var oFrom = oDateRange && oDateRange.getDateValue();
            var oTo = oDateRange && oDateRange.getSecondDateValue();

            if (sMSStatus && sMSType && oFrom && oTo) {

                var sODataField = this._resolveField(sMSStatus, sMSType);

                if (!sODataField) {
                    return;
                }

                var oFilter = new sap.ui.model.Filter(
                    sODataField,
                    sap.ui.model.FilterOperator.BT,
                    oFrom,
                    oTo
                );

                oBindingParams.filters.push(oFilter);
            }
        }

    });
});