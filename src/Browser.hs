{-# LANGUAGE ScopedTypeVariables, TypeApplications #-}

module Browser (
    getElementById,
    setTimeout,
    debug,
    withDebug
) where

import Universum
import FFI (procedure)
import Language.Javascript.JSaddle (JSM, jsg2, JSString)
import JSDOM (currentDocument)
import qualified JSDOM.Types as JSDOM (Element)
import JSDOM.Generated.ParentNode (querySelector)
import Data.Time (NominalDiffTime)
import qualified Shpadoinkle.Console as SC (debug)

debug :: Text -> JSM ()
debug = SC.debug @Show


withDebug :: Text -> JSM b -> JSM b
withDebug x f = do
  debug x
  ret <- f
  debug $ x <> " end"
  pure ret

getElementById :: Text -> JSM (Maybe JSDOM.Element)
getElementById id_ = do
  debug "getElementById"
  Just doc <- currentDocument
  doc `querySelector` ("#" <> id_)

setTimeout :: NominalDiffTime -> JSM () -> JSM ()
setTimeout timeout callback = do
  debug "setTimeout"
  _ <- jsg2 @JSString "setTimeout" (procedure callback) $ round @NominalDiffTime @Int (timeout * 1000)
  pure ()
