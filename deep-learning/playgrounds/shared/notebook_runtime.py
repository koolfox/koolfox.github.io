"""Connect notebook cells to the browser laboratory session."""

import sys
import traceback
from copy import deepcopy

from notebook_kernel import execute_cells, equivalent_configuration


def register_notebook(input, session, configuration, adopt):
    """Keep execution on the learner's browser, never on a hosted Shiny server."""
    from shiny import reactive

    last_record = reactive.value(None)

    @reactive.effect
    @reactive.event(input.notebook_run, ignore_none=True)
    async def run_notebook():
        request = input.notebook_run()
        identity = request.get("id") if isinstance(request, dict) else None
        response = {"id": identity, "ok": False, "outputs": []}
        try:
            if sys.platform != "emscripten":
                raise RuntimeError("دفترچه در نسخهٔ مرورگری اجرا می‌شود؛ فایل نوت‌بوک را می‌توان در Jupyter اجرا کرد.")
            if not isinstance(identity, str) or len(identity) > 64:
                raise ValueError("Invalid notebook request")
            # Shiny freezes array inputs as tuples. Normalize the two-field
            # cell records before the shared kernel validates their structure.
            request = {**request, "cells": [dict(cell) for cell in request["cells"]]}
            record, scope = execute_cells(request["cells"], request["until"],
                                          {"CONFIG": deepcopy(configuration())})
            response.update(record)
            if record["ok"]:
                # Adopt only a fully successful prefix. A syntax error cannot
                # replace the model currently shown by the laboratory.
                record["applied_to_lab"] = bool(adopt(scope))
                response.update(record)
                last_record.set({"schema_version": 1, "cells": request["cells"],
                                 "until": request["until"], **record})
        except Exception:
            response.update(ok=False, error=traceback.format_exc(limit=5)[-12000:])
        await session.send_custom_message("danna_notebook", response)

    return last_record
