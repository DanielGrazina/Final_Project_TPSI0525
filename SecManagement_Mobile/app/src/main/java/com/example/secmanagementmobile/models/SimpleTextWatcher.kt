package com.example.secmanagementmobile.models

import android.text.Editable
import android.text.TextWatcher

class SimpleTextWatcher(private val onText: (String) -> Unit) : TextWatcher {
    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
        onText(s?.toString().orEmpty())
    }
    override fun afterTextChanged(s: Editable?) {}
}
