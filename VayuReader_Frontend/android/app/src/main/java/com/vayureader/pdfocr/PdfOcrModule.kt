package com.vayureader.pdfocr

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.*
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File

class PdfOcrModule(
  private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PdfOcr"

  @ReactMethod
  fun ocrPage(
    pdfFilePath: String,
    pageNumber: Int,
    scale: Double,
    promise: Promise
  ) {

    Thread {

      var renderer: PdfRenderer? = null
      var pfd: ParcelFileDescriptor? = null
      var page: PdfRenderer.Page? = null

      try {

        val file = File(pdfFilePath)

        if (!file.exists()) {
          promise.reject(
            "ENOENT",
            "PDF file not found at path: $pdfFilePath"
          )
          return@Thread
        }

        if (pageNumber < 1) {
          promise.reject(
            "EINVAL",
            "pageNumber must be >= 1"
          )
          return@Thread
        }

        pfd = ParcelFileDescriptor.open(
          file,
          ParcelFileDescriptor.MODE_READ_ONLY
        )

        renderer = PdfRenderer(pfd)

        if (pageNumber > renderer.pageCount) {
          promise.reject(
            "EINVAL",
            "pageNumber exceeds pageCount=${renderer.pageCount}"
          )
          return@Thread
        }

        page = renderer.openPage(pageNumber - 1)

        // 2.0 is a good balance between speed and OCR quality
        val scaleFactor = scale.coerceAtLeast(2.0)

        val imageWidth = (page.width * scaleFactor).toInt()
        val imageHeight = (page.height * scaleFactor).toInt()

        val bitmap = Bitmap.createBitmap(
          imageWidth,
          imageHeight,
          Bitmap.Config.ARGB_8888
        )

        // White background helps OCR
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        // Better quality rendering for OCR
        page.render(
          bitmap,
          null,
          null,
          PdfRenderer.Page.RENDER_MODE_FOR_PRINT
        )

        val recognizer = TextRecognition.getClient(
          TextRecognizerOptions.DEFAULT_OPTIONS
        )

        val image = InputImage.fromBitmap(bitmap, 0)

        val textResult = Tasks.await(
          recognizer.process(image)
        )

        val words = Arguments.createArray()

        for (block in textResult.textBlocks) {
          for (line in block.lines) {
            for (element in line.elements) {

              val box: Rect? = element.boundingBox
              val text = element.text

              if (box != null && text.isNotBlank()) {

                val item = Arguments.createMap()

                item.putString("text", text)
                item.putInt("x", box.left)
                item.putInt("y", box.top)
                item.putInt("width", box.width())
                item.putInt("height", box.height())

                words.pushMap(item)
              }
            }
          }
        }

        val result = Arguments.createMap()

        result.putInt("page", pageNumber)
        result.putInt("imageWidth", imageWidth)
        result.putInt("imageHeight", imageHeight)
        result.putArray("words", words)

        promise.resolve(result)

        bitmap.recycle()

      } catch (e: Exception) {

        promise.reject(
          "E_OCR",
          e.message,
          e
        )

      } finally {

        try {
          page?.close()
        } catch (_: Exception) {
        }

        try {
          renderer?.close()
        } catch (_: Exception) {
        }

        try {
          pfd?.close()
        } catch (_: Exception) {
        }
      }

    }.start()
  }
}