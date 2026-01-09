"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Settings, FileSpreadsheet, Database, ArrowRight, Layers, RefreshCw } from "lucide-react";
import ImportForm from "./ImportForm";
import SplitRatioManager from "./SplitRatioManager";

export default function ImportDataBox() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [ratioModalOpen, setRatioModalOpen] = useState(false);

  // Listen for custom event to open import modal (from command palette)
  useEffect(() => {
    const handleOpenImport = () => setImportModalOpen(true);
    window.addEventListener("openImportModal", handleOpenImport);

    // Check if URL has ?import=true parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get("import") === "true") {
      setImportModalOpen(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => window.removeEventListener("openImportModal", handleOpenImport);
  }, []);

  return (
    <>
      {/* Main Container */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-muted/20 to-background shadow-xl">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-primary/5 to-transparent rounded-full" />
        </div>

        {/* Content */}
        <div className="relative p-8">
          {/* Header Section */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-wealth-gradient rounded-xl blur-lg opacity-50" />
              <div className="relative p-3 bg-wealth-gradient rounded-xl">
                <Database className="w-7 h-7 text-black" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Data Management</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Import spreadsheets and configure split ratios
              </p>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Import Data Card */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="group relative p-6 rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 text-left overflow-hidden"
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-wealth-gradient shadow-lg group-hover:shadow-xl transition-shadow">
                    <Upload className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      Import Spreadsheet
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Upload Excel files to import issuer data, shareholders, and transactions
                    </p>
                    <div className="flex items-center space-x-3 mt-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <FileSpreadsheet className="w-3 h-3 mr-1" />
                        .xlsx
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <FileSpreadsheet className="w-3 h-3 mr-1" />
                        .xls
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </button>

            {/* Split Ratios Card */}
            <button
              onClick={() => setRatioModalOpen(true)}
              className="group relative p-6 rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 text-left overflow-hidden"
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-muted border border-border group-hover:border-primary/50 group-hover:bg-primary/10 transition-all shadow-lg">
                    <Settings className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      Split Ratio Manager
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Adjust and configure split ratios for existing issuers
                    </p>
                    <div className="flex items-center space-x-3 mt-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <Layers className="w-3 h-3 mr-1" />
                        Units
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Warrants
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Import Modal - Full Screen Style */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-[95vw] xl:max-w-[1400px] max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 px-8 py-5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-wealth-gradient rounded-xl shadow-lg">
                    <Upload className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Import Spreadsheet</h3>
                    <p className="text-sm text-muted-foreground">Upload and preview your data before saving</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImportModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full w-10 h-10 p-0 text-xl font-light"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 p-8 overflow-y-auto">
              <ImportForm onClose={() => setImportModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Split Ratio Modal */}
      {ratioModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 px-8 py-5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-muted rounded-xl border border-border">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Split Ratio Manager</h3>
                    <p className="text-sm text-muted-foreground">Modify split ratios for existing issuers</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRatioModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full w-10 h-10 p-0 text-xl font-light"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 p-8 overflow-y-auto">
              <SplitRatioManager onClose={() => setRatioModalOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
