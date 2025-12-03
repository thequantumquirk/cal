"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Settings, FileSpreadsheet, Database } from "lucide-react";
import ImportForm from "./ImportForm";
import SplitRatioManager from "./SplitRatioManager";

export default function ImportDataBox() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [ratioModalOpen, setRatioModalOpen] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {/* Main Container */}
      <div className="p-6 border border-border rounded-xl bg-muted/30 shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-lg">
              <Database className="w-6 h-6 text-white" />
              {/* Split Ratio Modal */}
              {ratioModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Settings className="w-6 h-6 text-primary" />
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Adjust Split Ratios</h3>
                            <p className="text-sm text-muted-foreground">Modify split ratios for existing issuers</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRatioModalOpen(false)}
                          className="text-muted-foreground hover:bg-muted rounded-full w-8 h-8 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                      <SplitRatioManager onClose={() => setRatioModalOpen(false)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Data Management</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Import Excel data and manage split ratios efficiently
              </p>
            </div>
          </div>


        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Import Data Button */}
          <Button
            className="group relative h-14 bg-wealth-gradient text-black font-bold hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            onClick={() => setImportModalOpen(true)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-1 bg-black/10 rounded-md group-hover:bg-black/20 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Import Data</div>
                <div className="text-xs opacity-70">Excel/XLSX files</div>
              </div>
            </div>
            <FileSpreadsheet className="w-4 h-4 absolute top-2 right-2 opacity-40" />
          </Button>

          {/* Adjust Split Ratios Button */}
          <Button
            variant="outline"
            className="group h-14 border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            onClick={() => setRatioModalOpen(true)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-1 bg-muted rounded-md group-hover:bg-primary/10 transition-colors">
                <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Split Ratios</div>
                <div className="text-xs text-muted-foreground">Adjust & configure</div>
              </div>
            </div>
          </Button>
        </div>



        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <div className="w-full h-full bg-primary rounded-full transform rotate-12"></div>
        </div>
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Upload className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Import Excel Data</h3>
                    <p className="text-sm text-muted-foreground">Upload and preview your data before saving</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImportModalOpen(false)}
                  className="text-muted-foreground hover:bg-muted rounded-full w-8 h-8 p-0"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <ImportForm onClose={() => setImportModalOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}